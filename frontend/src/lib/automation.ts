import 'server-only';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import AutomationRule, { RuleTrigger } from '@/models/automationRule.model';
import { createNotification, notifyTenantByRole, sendEmail, emailTenantStaff, findTenantName } from '@/lib/notifications';
import { TicketService } from '@/services/tickets/ticket.service';

interface AutomationContext {
  tenantId: string;
  ticketId?: string;
  ticketNumber?: string;
  deviceLabel?: string;
  newStatus?: string;
  estimateAmount?: number;
  partId?: string;
  partName?: string;
  currentStock?: number;
  lowStockLimit?: number;
}

/**
 * Evaluates and fires every active rule matching `trigger` for this tenant.
 * Called fire-and-forget from the real events it represents (ticket created,
 * status changed, estimate set, stock adjusted) — a failure here must never
 * break the primary action that triggered it.
 */
export async function fireAutomationTrigger(
  trigger: RuleTrigger,
  ctx: AutomationContext
): Promise<void> {
  try {
    if (!ctx.tenantId || ctx.tenantId.length !== 24) return;
    await connectDB();

    const rules = await AutomationRule.find({
      tenantId: new mongoose.Types.ObjectId(ctx.tenantId),
      trigger,
      isActive: true,
    }).lean();

    for (const rule of rules) {
      if (!matchesTriggerValue(trigger, rule.triggerValue, ctx)) continue;

      await executeAction(rule as any, ctx);

      await AutomationRule.updateOne(
        { _id: rule._id },
        { $inc: { triggerCount: 1 }, $set: { lastTriggeredAt: new Date() } }
      );
    }
  } catch {
    // Automation is best-effort — never let it break the caller.
  }
}

function matchesTriggerValue(
  trigger: RuleTrigger,
  triggerValue: string | undefined,
  ctx: AutomationContext
): boolean {
  if (!triggerValue) return true; // no filter configured on the rule — always match

  switch (trigger) {
    case 'ticket_status_changed':
      return ctx.newStatus === triggerValue;
    case 'estimate_amount_exceeds':
      return (ctx.estimateAmount ?? 0) > Number(triggerValue);
    default:
      return true;
  }
}

function describeContext(ctx: AutomationContext): string {
  if (ctx.ticketNumber) {
    const parts = [ctx.ticketNumber];
    if (ctx.deviceLabel) parts.push(ctx.deviceLabel);
    if (ctx.newStatus) parts.push(`→ ${ctx.newStatus}`);
    if (ctx.estimateAmount !== undefined) parts.push(`Rs ${ctx.estimateAmount.toLocaleString()}`);
    return parts.join(' — ');
  }
  if (ctx.partName) {
    return `${ctx.partName} — ${ctx.currentStock ?? '?'} left (limit ${ctx.lowStockLimit ?? '?'})`;
  }
  return '';
}

async function executeAction(
  rule: { _id: mongoose.Types.ObjectId; name: string; action: string; actionTarget?: string; createdBy: mongoose.Types.ObjectId },
  ctx: AutomationContext
): Promise<void> {
  const summary = describeContext(ctx);
  const ruleActorId = String(rule.createdBy);
  const ruleActorName = `Automation: ${rule.name}`;

  switch (rule.action) {
    case 'notify_manager': {
      notifyTenantByRole(
        ctx.tenantId, ['owner', 'manager'], 'automation',
        `Automation: ${rule.name}`, summary,
        { ruleId: rule._id.toString(), ...ctx }
      );
      break;
    }

    case 'send_email': {
      const explicitTarget = rule.actionTarget && rule.actionTarget.includes('@') ? rule.actionTarget : null;
      const shopName = await findTenantName(ctx.tenantId);
      if (explicitTarget) {
        await sendEmail(
          explicitTarget,
          `Automation: ${rule.name}`,
          `<p>${summary}</p><p style="color:#6b7280;font-size:12px;">Triggered by automation rule "${rule.name}" at ${shopName}.</p>`
        );
      } else {
        await emailTenantStaff(
          ctx.tenantId, ['owner', 'manager'],
          `Automation: ${rule.name}`,
          (name) => `<p>Hi ${name},</p><p>${summary}</p><p style="color:#6b7280;font-size:12px;">Triggered by automation rule "${rule.name}".</p>`
        );
      }
      break;
    }

    case 'flag_for_review': {
      if (ctx.ticketId) {
        await TicketService.addNote({
          ticketId: ctx.ticketId,
          tenantId: ctx.tenantId,
          authorId: ruleActorId,
          authorName: ruleActorName,
          content: `Flagged for review — ${summary}`,
        }).catch(() => {});
      }
      break;
    }

    case 'auto_assign_senior_tech': {
      if (ctx.ticketId && rule.actionTarget && mongoose.Types.ObjectId.isValid(rule.actionTarget)) {
        await TicketService.assignTechnician({
          ticketId: ctx.ticketId,
          tenantId: ctx.tenantId,
          technicianId: rule.actionTarget,
          assignedByUserId: ruleActorId,
          assignedByName: ruleActorName,
        }).catch(() => {});
      }
      break;
    }

    case 'create_reorder_alert': {
      notifyTenantByRole(
        ctx.tenantId, ['owner', 'manager'], 'reorder_alert',
        `Reorder needed: ${ctx.partName ?? 'Part'}`, summary,
        { partId: ctx.partId, ...ctx }
      );
      break;
    }

    case 'send_sms': {
      // No SMS provider is configured on this platform — be honest about it
      // rather than silently doing nothing or pretending it was sent.
      createNotification({
        tenantId: ctx.tenantId,
        recipientUserId: ruleActorId,
        type: 'automation_sms_unavailable',
        title: `SMS not sent — no provider configured`,
        message: `Rule "${rule.name}" tried to text ${rule.actionTarget || 'a recipient'} but this platform has no SMS provider set up yet.`,
        metadata: { ruleId: rule._id.toString() },
      });
      break;
    }
  }
}
