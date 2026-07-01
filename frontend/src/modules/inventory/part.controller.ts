// src/modules/inventory/part.controller.ts
// M3 — Inventory & Parts Management Controller
// All RBAC checks, business logic, audit log calls live here.

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { sendResponse } from '@/utils/apiResponse';
import Part from '@/models/part.model';
import StockMovement, { STOCK_MOVEMENT_TYPES, StockMovementType } from '@/models/stockMovement.model';
import Ticket from '@/models/ticket.model';
import { AUDIT_ACTIONS } from '@/models/auditLog.model';
import { createAuditLog } from '@/services/auditLog.service';
import mongoose from 'mongoose';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCtx(req: NextRequest) {
  return {
    tenantId: req.headers.get('x-tenant-id') ?? '',
    userId:   req.headers.get('x-user-id')   ?? '',
    userName: req.headers.get('x-user-name') ?? 'Staff',
    role:     req.headers.get('x-role')      ?? '',
  };
}

const INVENTORY_VIEW_ROLES  = ['super_admin', 'owner', 'manager', 'frontdesk', 'technician'];
const INVENTORY_ADJUST_ROLES = ['super_admin', 'owner', 'manager'];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parts
// ─────────────────────────────────────────────────────────────────────────────
export async function getPartsHandler(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);

    if (!INVENTORY_VIEW_ROLES.includes(role)) {
      return sendResponse(false, 'Forbidden: insufficient permissions', null, 403);
    }

    const { searchParams } = new URL(req.url);
    const category  = searchParams.get('category');
    const lowStock  = searchParams.get('lowStock') === 'true';
    const search    = searchParams.get('search');
    const page      = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
    const limit     = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip      = (page - 1) * limit;

    // Build query — always scope to tenant + active
    const query: Record<string, any> = { tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true };

    if (category) {
      query.category = category;
    }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku:  { $regex: search, $options: 'i' } },
      ];
    }
    if (lowStock) {
      // Parts where quantity <= lowStockLimit
      query.$expr = { $lte: ['$quantity', '$lowStockLimit'] };
    }

    const [parts, total, lowStockCount, outOfStockCount] = await Promise.all([
      Part.find(query).sort({ name: 1 }).skip(skip).limit(limit).lean(),
      Part.countDocuments(query),
      // Low stock = qty > 0 AND qty <= lowStockLimit  (strictly "running low", not "out of stock")
      Part.countDocuments({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        isActive: true,
        quantity: { $gt: 0 },
        $expr: { $lte: ['$quantity', '$lowStockLimit'] },
      }),
      // Out of stock = qty === 0
      Part.countDocuments({
        tenantId: new mongoose.Types.ObjectId(tenantId),
        isActive: true,
        quantity: 0,
      }),
    ]);

    return sendResponse(true, 'Parts fetched successfully', {
      parts,
      total,
      page,
      limit,
      lowStockCount,
      outOfStockCount,
    });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/parts
// ─────────────────────────────────────────────────────────────────────────────
export async function createPartHandler(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);

    if (!INVENTORY_ADJUST_ROLES.includes(role)) {
      return sendResponse(false, 'Forbidden: only owners and managers can create parts', null, 403);
    }

    const body = await req.json();
    const { name, sku, category, costPrice, sellPrice, lowStockLimit, description, supplier, initialQuantity } = body;

    // Validate required fields
    if (!name || !sku || !category || costPrice === undefined || sellPrice === undefined) {
      return sendResponse(false, 'Missing required fields: name, sku, category, costPrice, sellPrice', null, 400);
    }
    if (typeof costPrice !== 'number' || costPrice < 0) {
      return sendResponse(false, 'costPrice must be a non-negative number', null, 400);
    }
    if (typeof sellPrice !== 'number' || sellPrice < 0) {
      return sendResponse(false, 'sellPrice must be a non-negative number', null, 400);
    }

    const skuUpper = String(sku).toUpperCase().trim();

    // SKU uniqueness check per tenant
    const existing = await Part.findOne({ tenantId: new mongoose.Types.ObjectId(tenantId), sku: skuUpper });
    if (existing) {
      return sendResponse(false, 'A part with this SKU already exists', null, 409);
    }

    const part = await Part.create({
      tenantId:      new mongoose.Types.ObjectId(tenantId),
      name:          String(name).trim(),
      sku:           skuUpper,
      category:      String(category).trim(),
      quantity:      0,  // Always start at 0; opening stock applied via movement below
      costPrice:     Number(costPrice),
      sellPrice:     Number(sellPrice),
      lowStockLimit: lowStockLimit !== undefined ? Number(lowStockLimit) : 5,
      description:   description ? String(description).trim() : undefined,
      supplier:      supplier ? String(supplier).trim() : undefined,
      isActive:      true,
    });

    // ── Opening stock movement (Bug 2 fix) ────────────────────────────────────
    const initQty = Number(initialQuantity ?? 0);
    let finalPart: typeof part | (typeof part & { quantity: number }) = part;

    if (Number.isFinite(initQty) && initQty > 0 && Number.isInteger(initQty)) {
      // Create append-only opening stock movement
      await StockMovement.create({
        tenantId:      new mongoose.Types.ObjectId(tenantId),
        partId:        part._id,
        type:          'added',
        quantity:      initQty,
        previousStock: 0,
        newStock:      initQty,
        performedBy:   new mongoose.Types.ObjectId(userId),
        note:          'Opening stock',
      });

      // Update the part's quantity to the opening stock value
      finalPart = (await Part.findByIdAndUpdate(
        part._id,
        { $set: { quantity: initQty } },
        { new: true }
      ))!;

      createAuditLog({
        tenantId,
        userId,
        action:   AUDIT_ACTIONS.INVENTORY_STOCK_ADDED,
        entity:   'part',
        entityId: String(part._id),
        details:  { type: 'added', quantity: initQty, previousStock: 0, newStock: initQty, note: 'Opening stock' },
      });
    }

    // Fire-and-forget audit log for part creation
    createAuditLog({
      tenantId,
      userId,
      action:   AUDIT_ACTIONS.INVENTORY_PART_CREATED,
      entity:   'part',
      entityId: String(part._id),
      details:  { name: part.name, sku: part.sku, category: part.category, initialQuantity: initQty },
    });

    return sendResponse(true, 'Part created successfully', finalPart, 201);
  } catch (err: any) {
    if (err.code === 11000) {
      return sendResponse(false, 'A part with this SKU already exists', null, 409);
    }
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parts/[partId]
// ─────────────────────────────────────────────────────────────────────────────
export async function getPartByIdHandler(req: NextRequest, partId: string): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);

    if (!INVENTORY_VIEW_ROLES.includes(role)) {
      return sendResponse(false, 'Forbidden: insufficient permissions', null, 403);
    }

    if (!mongoose.Types.ObjectId.isValid(partId)) {
      return sendResponse(false, 'Invalid part ID', null, 400);
    }

    const part = await Part.findOne({
      _id:      new mongoose.Types.ObjectId(partId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      isActive: true,
    }).lean();

    if (!part) {
      return sendResponse(false, 'Part not found', null, 404);
    }

    return sendResponse(true, 'Part retrieved successfully', part);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/parts/[partId]
// ─────────────────────────────────────────────────────────────────────────────
export async function updatePartHandler(req: NextRequest, partId: string): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);

    if (!INVENTORY_ADJUST_ROLES.includes(role)) {
      return sendResponse(false, 'Forbidden: only owners and managers can update parts', null, 403);
    }

    if (!mongoose.Types.ObjectId.isValid(partId)) {
      return sendResponse(false, 'Invalid part ID', null, 400);
    }

    const body = await req.json();

    // Only these fields can be updated — never quantity (via movements), sku, tenantId
    const ALLOWED_FIELDS = ['name', 'category', 'costPrice', 'sellPrice', 'lowStockLimit', 'description', 'supplier'];
    const updates: Record<string, any> = {};
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = field === 'name' || field === 'category' || field === 'description' || field === 'supplier'
          ? String(body[field]).trim()
          : Number(body[field]);
      }
    }

    if (Object.keys(updates).length === 0) {
      return sendResponse(false, 'No valid fields to update', null, 400);
    }

    const part = await Part.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(partId), tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!part) {
      return sendResponse(false, 'Part not found', null, 404);
    }

    // Fire-and-forget audit log
    createAuditLog({
      tenantId,
      userId,
      action:   AUDIT_ACTIONS.INVENTORY_PART_UPDATED,
      entity:   'part',
      entityId: partId,
      details:  { updates, partName: part.name },
    });

    return sendResponse(true, 'Part updated successfully', part);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/parts/[partId] — Soft delete only
// ─────────────────────────────────────────────────────────────────────────────
export async function deletePartHandler(req: NextRequest, partId: string): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);

    if (!INVENTORY_ADJUST_ROLES.includes(role)) {
      return sendResponse(false, 'Forbidden: only owners and managers can delete parts', null, 403);
    }

    if (!mongoose.Types.ObjectId.isValid(partId)) {
      return sendResponse(false, 'Invalid part ID', null, 400);
    }

    const part = await Part.findOneAndUpdate(
      { _id: new mongoose.Types.ObjectId(partId), tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true },
      { $set: { isActive: false } },
      { new: true }
    );

    if (!part) {
      return sendResponse(false, 'Part not found', null, 404);
    }

    // Fire-and-forget audit log
    createAuditLog({
      tenantId,
      userId,
      action:   AUDIT_ACTIONS.INVENTORY_PART_DELETED,
      entity:   'part',
      entityId: partId,
      details:  { name: part.name, sku: part.sku },
    });

    return sendResponse(true, 'Part deleted successfully', null);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/parts/[partId]/stock — Create stock movement
// ─────────────────────────────────────────────────────────────────────────────
export async function adjustStockHandler(req: NextRequest, partId: string): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);

    if (!mongoose.Types.ObjectId.isValid(partId)) {
      return sendResponse(false, 'Invalid part ID', null, 400);
    }

    const body = await req.json();
    const { type, quantity, note, ticketId } = body;

    // ── 1. Validate type ────────────────────────────────────────────────────
    if (!type || !STOCK_MOVEMENT_TYPES.includes(type as StockMovementType)) {
      return sendResponse(
        false,
        `Invalid movement type. Must be one of: ${STOCK_MOVEMENT_TYPES.join(', ')}`,
        null,
        400
      );
    }

    // ── 2. RBAC check by type ───────────────────────────────────────────────
    const movementType = type as StockMovementType;

    if (movementType === 'used') {
      // Technicians + owners + managers
      if (!['super_admin', 'owner', 'manager', 'technician'].includes(role)) {
        return sendResponse(false, 'Forbidden: cannot mark parts as used', null, 403);
      }
    } else {
      // added, adjusted, returned, damaged → owner + manager only
      if (!INVENTORY_ADJUST_ROLES.includes(role)) {
        return sendResponse(false, 'Forbidden: only owners and managers can adjust stock', null, 403);
      }
    }

    // ── 3. Validate quantity ────────────────────────────────────────────────
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return sendResponse(false, 'Quantity must be a positive integer greater than 0', null, 400);
    }

    // ── 4. Find the part ────────────────────────────────────────────────────
    const part = await Part.findOne({
      _id:      new mongoose.Types.ObjectId(partId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      isActive: true,
    });

    if (!part) {
      return sendResponse(false, 'Part not found', null, 404);
    }

    const currentStock = part.quantity;

    // ── 5. Check sufficient stock for deductions ────────────────────────────
    if ((movementType === 'used' || movementType === 'damaged') && qty > currentStock) {
      return sendResponse(
        false,
        `Insufficient stock. Available: ${currentStock} unit${currentStock !== 1 ? 's' : ''}`,
        null,
        400
      );
    }

    // ── 6. Calculate new stock ──────────────────────────────────────────────
    let newStock: number;
    switch (movementType) {
      case 'added':
      case 'returned':
        newStock = currentStock + qty;
        break;
      case 'used':
      case 'damaged':
        newStock = currentStock - qty;
        break;
      case 'adjusted':
        newStock = qty;  // Set directly — absolute value
        break;
    }

    // ── 7. Create stock movement record (append-only) ───────────────────────
    const movement = await StockMovement.create({
      tenantId:      new mongoose.Types.ObjectId(tenantId),
      partId:        new mongoose.Types.ObjectId(partId),
      type:          movementType,
      quantity:      qty,
      previousStock: currentStock,
      newStock,
      ticketId:      ticketId && mongoose.Types.ObjectId.isValid(ticketId)
                       ? new mongoose.Types.ObjectId(ticketId)
                       : undefined,
      performedBy:   new mongoose.Types.ObjectId(userId),
      note:          note ? String(note).trim() : undefined,
    });

    // ── 8. Update part quantity ─────────────────────────────────────────────
    const updatedPart = await Part.findByIdAndUpdate(
      partId,
      { $set: { quantity: newStock } },
      { new: true }
    );

    // ── 9. Low stock alert ──────────────────────────────────────────────────
    if (newStock <= part.lowStockLimit) {
      console.warn(
        `LOW STOCK ALERT: ${part.name} (SKU: ${part.sku}) — ${newStock} unit${newStock !== 1 ? 's' : ''} remaining (limit: ${part.lowStockLimit})`
      );
    }

    // ── 10. Fire-and-forget audit log ───────────────────────────────────────
    const auditActionMap: Record<StockMovementType, string> = {
      added:    AUDIT_ACTIONS.INVENTORY_STOCK_ADDED,
      used:     AUDIT_ACTIONS.INVENTORY_STOCK_USED,
      adjusted: AUDIT_ACTIONS.INVENTORY_STOCK_ADJUSTED,
      returned: AUDIT_ACTIONS.INVENTORY_STOCK_ADDED,
      damaged:  AUDIT_ACTIONS.INVENTORY_STOCK_DAMAGED,
    };

    createAuditLog({
      tenantId,
      userId,
      action:   auditActionMap[movementType],
      entity:   'stockMovement',
      entityId: String(movement._id),
      details:  { type: movementType, quantity: qty, previousStock: currentStock, newStock, partName: part.name, partSku: part.sku },
    });

    return sendResponse(true, `Stock ${movementType} recorded successfully`, {
      part:     updatedPart,
      movement,
    });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/parts/[partId]/stock — Movement history for one part
// ─────────────────────────────────────────────────────────────────────────────
export async function getStockHistoryHandler(req: NextRequest, partId: string): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);

    if (!INVENTORY_ADJUST_ROLES.includes(role)) {
      return sendResponse(false, 'Forbidden: only owners and managers can view stock history', null, 403);
    }

    if (!mongoose.Types.ObjectId.isValid(partId)) {
      return sendResponse(false, 'Invalid part ID', null, 400);
    }

    const movements = await StockMovement.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      partId:   new mongoose.Types.ObjectId(partId),
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('performedBy', 'name email')
      .lean();

    return sendResponse(true, 'Stock history retrieved', movements);
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stock-movements — All movements for tenant
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllStockMovementsHandler(req: NextRequest): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, role } = getCtx(req);

    if (!INVENTORY_ADJUST_ROLES.includes(role)) {
      return sendResponse(false, 'Forbidden: only owners and managers can view stock movements', null, 403);
    }

    const { searchParams } = new URL(req.url);
    const typeFilter     = searchParams.get('type');
    const partIdFilter   = searchParams.get('partId');
    const ticketIdFilter = searchParams.get('ticketId');
    const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
    const skip  = (page - 1) * limit;

    const query: Record<string, any> = { tenantId: new mongoose.Types.ObjectId(tenantId) };

    if (typeFilter && STOCK_MOVEMENT_TYPES.includes(typeFilter as StockMovementType)) {
      query.type = typeFilter;
    }
    if (partIdFilter && mongoose.Types.ObjectId.isValid(partIdFilter)) {
      query.partId = new mongoose.Types.ObjectId(partIdFilter);
    }
    if (ticketIdFilter && mongoose.Types.ObjectId.isValid(ticketIdFilter)) {
      query.ticketId = new mongoose.Types.ObjectId(ticketIdFilter);
    }

    const [movements, total] = await Promise.all([
      StockMovement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('partId', 'name sku')
        .populate('performedBy', 'name email')
        .lean(),
      StockMovement.countDocuments(query),
    ]);

    return sendResponse(true, 'Stock movements retrieved', { movements, total, page, limit });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tickets/[id]/parts — Use a part on a ticket (M2-M3 bridge)
// ─────────────────────────────────────────────────────────────────────────────
export async function usePartOnTicketHandler(req: NextRequest, ticketId: string): Promise<NextResponse> {
  await connectDB();
  try {
    const { tenantId, userId, role } = getCtx(req);

    // Technician + owner + manager can use parts on tickets
    if (!['super_admin', 'owner', 'manager', 'technician'].includes(role)) {
      return sendResponse(false, 'Forbidden: insufficient permissions', null, 403);
    }

    if (!mongoose.Types.ObjectId.isValid(ticketId)) {
      return sendResponse(false, 'Invalid ticket ID', null, 400);
    }

    // Verify ticket belongs to this tenant
    const ticket = await Ticket.findOne({
      _id:      new mongoose.Types.ObjectId(ticketId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!ticket) {
      return sendResponse(false, 'Ticket not found', null, 404);
    }

    const body = await req.json();
    const { partId, quantity } = body;

    if (!partId || !quantity) {
      return sendResponse(false, 'partId and quantity are required', null, 400);
    }
    if (!mongoose.Types.ObjectId.isValid(partId)) {
      return sendResponse(false, 'Invalid part ID', null, 400);
    }

    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isInteger(qty)) {
      return sendResponse(false, 'Quantity must be a positive integer', null, 400);
    }

    // Find part
    const part = await Part.findOne({
      _id:      new mongoose.Types.ObjectId(partId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
      isActive: true,
    });

    if (!part) {
      return sendResponse(false, 'Part not found', null, 404);
    }

    if (qty > part.quantity) {
      return sendResponse(
        false,
        `Insufficient stock. Available: ${part.quantity} unit${part.quantity !== 1 ? 's' : ''}`,
        null,
        400
      );
    }

    const previousStock = part.quantity;
    const newStock = previousStock - qty;

    // Create stock movement (type: used, with ticketId)
    const movement = await StockMovement.create({
      tenantId:      new mongoose.Types.ObjectId(tenantId),
      partId:        new mongoose.Types.ObjectId(partId),
      type:          'used',
      quantity:      qty,
      previousStock,
      newStock,
      ticketId:      new mongoose.Types.ObjectId(ticketId),
      performedBy:   new mongoose.Types.ObjectId(userId),
      note:          `Used on ticket`,
    });

    // Update part quantity
    await Part.findByIdAndUpdate(partId, { $set: { quantity: newStock } });

    // Low stock alert
    if (newStock <= part.lowStockLimit) {
      console.warn(`LOW STOCK ALERT: ${part.name} (SKU: ${part.sku}) — ${newStock} units remaining`);
    }

    // Add part to ticket's partsUsed array
    const updatedTicket = await Ticket.findByIdAndUpdate(
      ticketId,
      {
        $push: {
          partsUsed: {
            partId:   new mongoose.Types.ObjectId(partId),
            name:     part.name,
            sku:      part.sku,
            quantity: qty,
            addedAt:  new Date(),
          },
        },
      },
      { new: true }
    );

    // Fire-and-forget audit log
    createAuditLog({
      tenantId,
      userId,
      action:   AUDIT_ACTIONS.INVENTORY_PART_USED_ON_TICKET,
      entity:   'ticket',
      entityId: ticketId,
      details:  { partId, partName: part.name, partSku: part.sku, quantity: qty, previousStock, newStock },
    });

    return sendResponse(true, 'Part used on ticket successfully', {
      ticket:   updatedTicket,
      movement,
    });
  } catch (err: any) {
    return sendResponse(false, err.message ?? 'Server error', null, 500);
  }
}
