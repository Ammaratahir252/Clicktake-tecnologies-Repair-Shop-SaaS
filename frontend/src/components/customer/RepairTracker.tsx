"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Package, 
  Search, 
  Wrench, 
  CheckCircle2, 
  Truck, 
  Clock,
  MapPin,
  Phone,
  Mail
} from "lucide-react";

interface RepairStatus {
  id: string;
  ticketNumber: string;
  deviceType: string;
  deviceModel: string;
  issueDescription: string;
  currentStatus: "received" | "diagnosed" | "repair" | "qc" | "ready" | "delivered";
  estimatedCompletion: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
}

const statusSteps = [
  { key: "received", label: "Received", icon: Package, color: "text-blue-600" },
  { key: "diagnosed", label: "Diagnosis", icon: Search, color: "text-purple-600" },
  { key: "repair", label: "Repair", icon: Wrench, color: "text-amber-600" },
  { key: "qc", label: "Quality Check", icon: CheckCircle2, color: "text-emerald-600" },
  { key: "ready", label: "Ready", icon: CheckCircle2, color: "text-green-600" },
  { key: "delivered", label: "Delivered", icon: Truck, color: "text-teal-600" },
];

interface RepairTrackerProps {
  repair: RepairStatus;
}

export function RepairTracker({ repair }: RepairTrackerProps) {
  const currentStepIndex = statusSteps.findIndex((step) => step.key === repair.currentStatus);
  const progress = ((currentStepIndex + 1) / statusSteps.length) * 100;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl">Repair Status</CardTitle>
              <CardDescription className="mt-2">
                Track your device repair in real-time
              </CardDescription>
            </div>
            <Badge variant={repair.currentStatus} className="text-sm px-3 py-1">
              {statusSteps[currentStepIndex]?.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Ticket Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Number</p>
                <p className="text-lg font-bold font-mono">{repair.ticketNumber}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Device</p>
                <p className="text-lg font-semibold">
                  {repair.deviceType} - {repair.deviceModel}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Issue</p>
                <p className="text-sm">{repair.issueDescription}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Completion</p>
                <p className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {new Date(repair.estimatedCompletion).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Overall Progress</span>
                <span className="text-muted-foreground">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Repair Timeline</CardTitle>
          <CardDescription>Follow your device through each stage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

            {/* Steps */}
            <div className="space-y-8">
              {statusSteps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;

                return (
                  <div key={step.key} className="relative flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-background transition-all",
                        isCompleted
                          ? "bg-primary text-primary-foreground shadow-lg"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1.5">
                      <div className="flex items-center gap-3">
                        <h3
                          className={cn(
                            "text-lg font-semibold",
                            isCompleted ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {step.label}
                        </h3>
                        {isCurrent && (
                          <Badge variant="outline" className="animate-pulse">
                            In Progress
                          </Badge>
                        )}
                        {isCompleted && !isCurrent && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {isCompleted
                          ? isCurrent
                            ? "Currently being processed"
                            : "Completed"
                          : "Pending"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Contact us for any questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Phone className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{repair.customerPhone}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm font-medium">{repair.customerEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">Visit Shop</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Made with Bob
