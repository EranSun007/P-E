import React from "react";
import { Badge } from "@/components/ui/badge";

export default function PeerAgendaBadge({ count = 0, unresolvedCount = 0, hasUnresolved = false, onClick, peerName, size = "sm" }) {
  return (
    <Badge variant={hasUnresolved ? "destructive" : "outline"} className={`cursor-pointer ${size === "sm" ? "text-xs px-2" : "text-base px-4"}`} onClick={onClick}>
      {peerName}: {count} agenda{count !== 1 ? "s" : ""}
      {hasUnresolved && unresolvedCount > 0 && (
        <span className="ml-1 text-red-600">({unresolvedCount} unresolved)</span>
      )}
    </Badge>
  );
}
