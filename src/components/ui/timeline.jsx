import React from "react";
import { cn } from "@/lib/utils";

export function TimelineItem({ icon, title, subtitle, timestamp, variant = "default" }) {
  return (
    <div className="flex gap-4 pb-8 last:pb-0">
      <div className="flex flex-col items-center">
        <div className={cn(
          "rounded-full p-2",
          variant === "outline" 
            ? "border-2 border-gray-200" 
            : "bg-gray-100"
        )}>
          {icon}
        </div>
        {/* Line */}
        <div className="flex-1 w-px bg-gray-200 my-2"></div>
      </div>
      <div>
        <div className="font-medium">{title}</div>
        {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        <div className="text-xs text-gray-400">{timestamp}</div>
      </div>
    </div>
  );
}

export function Timeline({ children }) {
  return (
    <div className="space-y-4">
      {children}
    </div>
  );
}