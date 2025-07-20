import React from "react";
import { Badge } from "@/components/ui/badge";

export default function PeerOutOfOfficeManager({ peerId, peerName, outOfOfficePeriods = [], onAdd, onRemove }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold">Out-of-Office Management</h3>
      <div className="space-y-2">
        {outOfOfficePeriods.length === 0 ? (
          <p className="text-gray-500">No out-of-office periods recorded for {peerName}.</p>
        ) : (
          outOfOfficePeriods.map(period => (
            <div key={period.id} className="flex items-center gap-2">
              <Badge variant="outline">{period.status}</Badge>
              <span>{period.start_date} - {period.end_date}</span>
              {period.notes && <span className="text-xs text-gray-500">({period.notes})</span>}
              <button className="text-red-500 ml-2" onClick={() => onRemove(period.id)}>Remove</button>
            </div>
          ))
        )}
      </div>
      <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={onAdd}>Add Out-of-Office</button>
    </div>
  );
}
