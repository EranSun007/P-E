
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Stakeholder } from "@/api/entities";
import { TeamMember } from "@/api/entities";
import { safeArray } from "@/components/utils/SafeArray";

export default function MeetingMetadataForm({ metadata = {}, onChange }) {
  const safeMetadata = {
    location: "",
    participants: [],
    agenda: [],
    ...metadata
  };

  const [stakeholders, setStakeholders] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [agendaText, setAgendaText] = useState("");

  // Effect to initialize agenda text from metadata
  useEffect(() => {
    if (Array.isArray(safeMetadata.agenda)) {
      setAgendaText(safeMetadata.agenda.join('\n'));
    }
  }, []);

  useEffect(() => {
    setSelectedParticipants(safeArray(metadata?.participants));
  }, [metadata]);

  useEffect(() => {
    loadParticipants();
  }, []);

  const loadParticipants = async () => {
    try {
      const [stakeholderData, teamMemberData] = await Promise.all([
        Stakeholder.list().catch(() => []),
        TeamMember.list().catch(() => [])
      ]);
      
      setStakeholders(safeArray(stakeholderData));
      setTeamMembers(safeArray(teamMemberData));
    } catch (error) {
      console.error("Error loading participants:", error);
      setStakeholders([]);
      setTeamMembers([]);
    }
  };

  const updateField = (field, value) => {
    onChange({
      ...safeMetadata,
      [field]: value
    });
  };

  const handleAgendaChange = (e) => {
    const value = e.target.value;
    setAgendaText(value);
    
    // Convert text to array of agenda items
    const agendaItems = value.split('\n').map(item => item.trim()).filter(Boolean);
    updateField("agenda", agendaItems);
  };

  const addParticipant = (name) => {
    if (!selectedParticipants.includes(name)) {
      const updated = [...selectedParticipants, name];
      setSelectedParticipants(updated);
      updateField("participants", updated);
    }
    setPopoverOpen(false);
  };

  const removeParticipant = (name) => {
    const updated = selectedParticipants.filter(p => p !== name);
    setSelectedParticipants(updated);
    updateField("participants", updated);
  };

  return (
    <div className="mt-6 border-t pt-6">
      <h3 className="font-medium text-lg mb-4">Meeting Details</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <Input
            value={safeMetadata.location || ""}
            onChange={(e) => updateField("location", e.target.value)}
            placeholder="Meeting location or link"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Participants</label>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-1 p-1 border rounded-md min-h-10">
              {safeArray(selectedParticipants).map((participant) => (
                <Badge key={participant} variant="secondary" className="flex items-center gap-1">
                  {participant}
                  <button 
                    type="button" 
                    onClick={() => removeParticipant(participant)}
                    className="ml-1 rounded-full hover:bg-gray-200 p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-between"
                >
                  <div className="flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Add participants
                  </div>
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search participants..." />
                  <CommandEmpty>No participants found.</CommandEmpty>
                  
                  {safeArray(teamMembers).length > 0 && (
                    <CommandGroup heading="Team Members">
                      {safeArray(teamMembers).map(member => (
                        <CommandItem 
                          key={member.id} 
                          onSelect={() => addParticipant(member.name)}
                        >
                          <Check 
                            className={`mr-2 h-4 w-4 ${
                              selectedParticipants.includes(member.name) ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {member.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  
                  {safeArray(stakeholders).length > 0 && (
                    <CommandGroup heading="Stakeholder Groups">
                      {safeArray(stakeholders).map(stakeholder => (
                        <CommandItem 
                          key={stakeholder.id} 
                          onSelect={() => addParticipant(stakeholder.name)}
                        >
                          <Check 
                            className={`mr-2 h-4 w-4 ${
                              selectedParticipants.includes(stakeholder.name) ? "opacity-100" : "opacity-0"
                            }`}
                          />
                          {stakeholder.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Agenda Items</label>
          <Textarea
            value={agendaText}
            onChange={handleAgendaChange}
            placeholder="Enter agenda items (one per line)"
            className="h-24"
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter each agenda item on a new line
          </p>
        </div>
      </div>
    </div>
  );
}
