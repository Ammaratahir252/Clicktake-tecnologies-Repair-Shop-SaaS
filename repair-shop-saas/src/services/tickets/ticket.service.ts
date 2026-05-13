// src/services/tickets/ticket.service.ts
import mongoose from 'mongoose';
import Ticket from '@/models/ticket.model';
import '@/models/customer.model'; // <--- ADD THIS LINE
import '@/models/user.model';     // <--- ADD THIS LINE (for the technician populate)
import { TicketStatus, TICKET_STATUS_TRANSITIONS } from '@/lib/enums';

// ─── Input Types ──────────────────────────────────────────────────────────────

interface CreateTicketInput {
  tenantId: string;
  customerId: string;
  deviceBrand: string;
  deviceModel: string;
  issue: string;
  deviceColor?: string;
  deviceIMEI?: string;
  photos?: string[];
  createdByUserId: string;
  createdByName: string;
}

interface UpdateStatusInput {
  ticketId: string;
  tenantId: string;
  newStatus: TicketStatus;
  changedByUserId: string;
  changedByName: string;
  note?: string;
}

interface AssignTechnicianInput {
  ticketId: string;
  tenantId: string;
  technicianId: string;
  assignedByUserId: string;
  assignedByName: string;
}

interface AddNoteInput {
  ticketId: string;
  tenantId: string;
  authorId: string;
  authorName: string;
  content: string;
}

interface SetEstimateInput {
  ticketId: string;
  tenantId: string;
  estimateAmount: number;
  updatedByUserId: string;
  updatedByName: string;
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Generates TKT-0001, TKT-0042 etc.
 * Counts existing tenant tickets and increments by 1.
 */
async function generateTicketNumber(tenantId: string): Promise<string> {
  if (!tenantId || tenantId.length !== 24) {
    throw new Error('Invalid Tenant ID for generating ticket number');
  }

  const query = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  const count = await Ticket.countDocuments(query);
  const padded = String(count + 1).padStart(4, '0');
  return `TKT-${padded}`;
}

/**
 * Throws a descriptive error if the transition is not in the allowed map.
 * This is the single enforcement point — never bypassed.
 */
function assertValidTransition(from: TicketStatus, to: TicketStatus): void {
  const allowed = TICKET_STATUS_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid status transition: '${from}' → '${to}'. ` +
      `Allowed next statuses: [${allowed.join(', ') || 'none — this status is terminal'}]`
    );
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const TicketService = {

  /**
   * CREATE TICKET
   * Auto-generates ticket number. Logs initial 'received' entry in statusHistory.
   */
  createTicket: async (data: CreateTicketInput) => {
    const {
      tenantId, customerId, deviceBrand, deviceModel,
      issue, deviceColor, deviceIMEI, photos,
      createdByUserId, createdByName,
    } = data;

    if (!tenantId || tenantId.length !== 24) {
      throw new Error('Unauthorized: Valid Tenant ID is missing. Check middleware.');
    }
    if (!createdByUserId || createdByUserId.length !== 24) {
      throw new Error('Unauthorized: Valid User ID is missing.');
    }

    const ticketNumber = await generateTicketNumber(tenantId);

    const ticket = await Ticket.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      customerId: new mongoose.Types.ObjectId(customerId),
      ticketNumber,
      deviceBrand,
      deviceModel,
      issue,
      deviceColor: deviceColor ?? undefined,
      deviceIMEI: deviceIMEI ?? undefined,
      photos: photos ?? [],
      status: TicketStatus.received,
      statusHistory: [{
        changedBy: new mongoose.Types.ObjectId(createdByUserId),
        changedByName: createdByName || 'Staff',
        fromStatus: TicketStatus.received,
        toStatus: TicketStatus.received,
        note: 'Ticket created',
        createdAt: new Date(),
      }],
    });

    return ticket;
  },

  /**
   * GET ALL TICKETS
   * Always scoped to tenantId. Optional status filter from query params.
   */
  getTickets: async (tenantId: string, statusFilter?: TicketStatus) => {
    if (!tenantId || tenantId.length !== 24) {
      throw new Error('Unauthorized: Valid Tenant ID is missing. Check middleware.');
    }

    const query: Record<string, unknown> = {
      tenantId: new mongoose.Types.ObjectId(tenantId),
    };

    if (statusFilter) query.status = statusFilter;

    return Ticket.find(query)
      .populate('customerId', 'name phone')
      .populate('technicianId', 'name email')
      .sort({ createdAt: -1 });
  },

  /**
   * GET SINGLE TICKET
   * Scoped by tenantId — can never return another tenant's ticket.
   */
  getTicketById: async (ticketId: string, tenantId: string) => {
    const ticket = await Ticket.findOne({
      _id: new mongoose.Types.ObjectId(ticketId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    })
      .populate('customerId', 'name phone email address')
      .populate('technicianId', 'name email role');

    if (!ticket) throw new Error('Ticket not found');
    return ticket;
  },

  /**
   * UPDATE STATUS
   * Validates transition, then appends to statusHistory.
   */
  updateTicketStatus: async (data: UpdateStatusInput) => {
    const { ticketId, tenantId, newStatus, changedByUserId, changedByName, note } = data;

    const ticket = await Ticket.findOne({
      _id: new mongoose.Types.ObjectId(ticketId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!ticket) throw new Error('Ticket not found');

    assertValidTransition(ticket.status, newStatus);

    const previousStatus = ticket.status;
    ticket.status = newStatus;
    ticket.statusHistory.push({
      changedBy: new mongoose.Types.ObjectId(changedByUserId),
      changedByName,
      fromStatus: previousStatus,
      toStatus: newStatus,
      note: note ?? undefined,
      createdAt: new Date(),
    });

    await ticket.save();
    return ticket;
  },

  /**
   * ASSIGN TECHNICIAN
   * Prevents assignment to terminal statuses. Logs in statusHistory.
   */
  assignTechnician: async (data: AssignTechnicianInput) => {
    const { ticketId, tenantId, technicianId, assignedByUserId, assignedByName } = data;

    const ticket = await Ticket.findOne({
      _id: new mongoose.Types.ObjectId(ticketId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!ticket) throw new Error('Ticket not found');

    if (
      ticket.status === TicketStatus.delivered ||
      ticket.status === TicketStatus.cancelled
    ) {
      throw new Error(`Cannot assign technician to a '${ticket.status}' ticket`);
    }

    ticket.technicianId = new mongoose.Types.ObjectId(technicianId);
    ticket.statusHistory.push({
      changedBy: new mongoose.Types.ObjectId(assignedByUserId),
      changedByName: assignedByName,
      fromStatus: ticket.status,
      toStatus: ticket.status,
      note: `Technician assigned (id: ${technicianId})`,
      createdAt: new Date(),
    });

    await ticket.save();
    return ticket;
  },

  /**
   * ADD NOTE
   * Appends a note. Never overwrites. Works at any status.
   */
  addNote: async (data: AddNoteInput) => {
    const { ticketId, tenantId, authorId, authorName, content } = data;

    const ticket = await Ticket.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(ticketId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
      },
      {
        $push: {
          notes: {
            authorId: new mongoose.Types.ObjectId(authorId),
            authorName,
            content,
            createdAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (!ticket) throw new Error('Ticket not found');
    return ticket;
  },

  /**
   * SET ESTIMATE
   * Records the estimate amount and auto-transitions to estimate_sent.
   * Only valid when ticket is in 'diagnosed' status.
   */
  setEstimate: async (data: SetEstimateInput) => {
    const { ticketId, tenantId, estimateAmount, updatedByUserId, updatedByName } = data;

    const ticket = await Ticket.findOne({
      _id: new mongoose.Types.ObjectId(ticketId),
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!ticket) throw new Error('Ticket not found');

    assertValidTransition(ticket.status, TicketStatus.estimate_sent);

    const previousStatus = ticket.status;
    ticket.estimateAmount = estimateAmount;
    ticket.status = TicketStatus.estimate_sent;
    ticket.statusHistory.push({
      changedBy: new mongoose.Types.ObjectId(updatedByUserId),
      changedByName: updatedByName,
      fromStatus: previousStatus,
      toStatus: TicketStatus.estimate_sent,
      note: `Estimate set: ${estimateAmount}`,
      createdAt: new Date(),
    });

    await ticket.save();
    return ticket;
  },

  /**
   * GET TECHNICIAN TICKETS
   * RBAC rule: technician sees ONLY their own assigned tickets.
   */
  getTechnicianTickets: async (technicianId: string, tenantId: string) => {
    return Ticket.find({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      technicianId: new mongoose.Types.ObjectId(technicianId),
    })
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });
  },
};