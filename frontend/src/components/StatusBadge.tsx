import React from "react";

export interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getBadgeStyle = (s: string) => {
    switch (s) {
      case "received":      return "bg-slate-100 text-slate-700";
      case "diagnosed":     return "bg-blue-100 text-blue-700";
      case "estimate_sent": return "bg-amber-100 text-amber-700";
      case "approved":      return "bg-purple-100 text-purple-700";
      case "in_repair":     return "bg-orange-100 text-orange-700";
      case "ready":         return "bg-emerald-100 text-emerald-700";
      case "delivered":     return "bg-green-100 text-green-700";
      case "cancelled":     return "bg-red-100 text-red-700";
      default:              return "bg-slate-100 text-slate-700";
    }
  };

  const formatStatus = (s: string) => {
    return s
      .split("_")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-wider uppercase ${getBadgeStyle(status)}`}>
      {formatStatus(status)}
    </span>
  );
}
