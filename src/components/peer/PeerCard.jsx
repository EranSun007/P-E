import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Tag, BriefcaseBusiness, Mail, Code } from "lucide-react";

export default function PeerCard({ peer, onClick }) {
  if (!peer) return null;
  const getInitials = (name) => name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
  return (
    <Card className="overflow-hidden cursor-pointer" onClick={onClick}>
      <CardHeader className="pb-3">
        <div className="flex items-start space-x-4">
          <Avatar className={`h-12 w-12 ${peer.avatar ? "" : "bg-blue-100 text-blue-800"} ring-2 ring-white`}>
            {peer.avatar ? <AvatarImage src={peer.avatar} alt={peer.name} /> : null}
            <AvatarFallback>{getInitials(peer.name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{peer.name}</CardTitle>
            {peer.role && <CardDescription>{peer.role}</CardDescription>}
            {peer.organization && (
              <CardDescription className="flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {peer.organization}
              </CardDescription>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {peer.department && (
            <Badge variant="outline" className="flex items-center gap-1">
              <BriefcaseBusiness className="h-3 w-3" /> {peer.department}
            </Badge>
          )}
          {peer.relationship_type && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="h-3 w-3" /> {peer.relationship_type.replace(/_/g, " ")}
            </Badge>
          )}
          {peer.collaboration_context && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Tag className="h-3 w-3" /> {peer.collaboration_context}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {Array.isArray(peer.skills) && peer.skills.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Code className="h-3.5 w-3.5" /> Skills
            </h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {peer.skills.map((skill, i) => (
                <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
              ))}
            </div>
          </div>
        )}
        {peer.notes && <p className="text-sm text-gray-600">{peer.notes}</p>}
      </CardContent>
      {peer.email && (
        <CardFooter className="border-t pt-4">
          <a href={`mailto:${peer.email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            <Mail className="h-3.5 w-3.5" /> {peer.email}
          </a>
        </CardFooter>
      )}
    </Card>
  );
}
