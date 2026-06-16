/**
 * models/automationRule.model.ts
 * Module 8 — AI Workflow Automation Builder
 *
 * Stores IF/THEN automation rules per tenant.
 * Each rule is evaluated by the backend when relevant events fire.
 */

import mongoose, { Schema, Document, Model } from "mongoose";

export type RuleTrigger =
  | "ticket_status_changed"
  | "estimate_amount_exceeds"
  | "part_stock_below_limit"
  | "ticket_created"
  | "ticket_overdue";

export type RuleAction =
  | "send_sms"
  | "send_email"
  | "notify_manager"
  | "auto_assign_senior_tech"
  | "flag_for_review"
  | "create_reorder_alert";

export interface IAutomationRule extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  trigger: RuleTrigger;
  triggerValue?: string;
  action: RuleAction;
  actionTarget?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  lastTriggeredAt?: Date;
  triggerCount: number;
  aiValidation?: {
    isValid: boolean;
    riskLevel: "low" | "medium" | "high";
    riskReason: string;
    validatedAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const AutomationRuleSchema = new Schema<IAutomationRule>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: [true, "tenantId is required"],
    },
    name: {
      type: String,
      required: [true, "Rule name is required"],
      trim: true,
      maxlength: 120,
    },
    description: { type: String, trim: true },
    trigger: {
      type: String,
      enum: [
        "ticket_status_changed",
        "estimate_amount_exceeds",
        "part_stock_below_limit",
        "ticket_created",
        "ticket_overdue",
      ],
      required: true,
    },
    triggerValue: { type: String, trim: true },
    action: {
      type: String,
      enum: [
        "send_sms",
        "send_email",
        "notify_manager",
        "auto_assign_senior_tech",
        "flag_for_review",
        "create_reorder_alert",
      ],
      required: true,
    },
    actionTarget: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastTriggeredAt: { type: Date, default: null },
    triggerCount: { type: Number, default: 0, min: 0 },
    aiValidation: {
      isValid: Boolean,
      riskLevel: { type: String, enum: ["low", "medium", "high"] },
      riskReason: String,
      validatedAt: Date,
    },
  },
  {
    timestamps: true,
    collection: "automationRules",
  }
);

AutomationRuleSchema.index({ tenantId: 1, isActive: 1 });
AutomationRuleSchema.index({ tenantId: 1, trigger: 1 });

const AutomationRule: Model<IAutomationRule> =
  (mongoose.models.AutomationRule as Model<IAutomationRule>) ||
  mongoose.model<IAutomationRule>("AutomationRule", AutomationRuleSchema, "automationRules");

export default AutomationRule;
