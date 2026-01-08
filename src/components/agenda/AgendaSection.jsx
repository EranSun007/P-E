import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { AgendaItem } from '@/api/oneOnOneAgenda';
import AgendaItemForm from '@/components/agenda/AgendaItemForm';
import AgendaItemList from '@/components/agenda/AgendaItemList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * AgendaSection - Container component for managing 1:1 agenda items
 * 
 * @param {Object} props
 * @param {string} props.teamMemberId - ID of the team member
 * @param {string} props.teamMemberName - Name of the team member
 */
const AgendaSection = ({ teamMemberId, teamMemberName }) => {
  const [agendaItems, setAgendaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    loadAgendaItems();
  }, [teamMemberId]);

  const loadAgendaItems = async () => {
    setLoading(true);
    try {
      const items = await AgendaItem.getByTeamMember(teamMemberId);
      setAgendaItems(items);
    } catch (error) {
      console.error('Error loading agenda items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAgendaItemSubmit = async () => {
    setShowAddForm(false);
    await loadAgendaItems();
  };

  const handleMarkDiscussed = async (agendaItem) => {
    try {
      await AgendaItem.update(agendaItem.id, { status: 'discussed' });
      await loadAgendaItems();
    } catch (error) {
      console.error('Error marking agenda item as discussed:', error);
    }
  };

  const filteredItems = agendaItems.filter(item => {
    if (activeTab === 'pending') {
      return item.status === 'pending';
    } else if (activeTab === 'discussed') {
      return item.status === 'discussed';
    }
    return true; // 'all' tab
  });

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>1:1 Agenda</CardTitle>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="discussed">Discussed</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="pending" className="mt-0">
            {loading ? (
              <div className="text-center py-6">Loading...</div>
            ) : (
              <AgendaItemList
                items={filteredItems}
                loading={loading}
                onComplete={handleMarkDiscussed}
                emptyMessage="No pending agenda items"
                emptyDescription="Add items to discuss in your next 1:1 meeting."
              />
            )}
          </TabsContent>
          
          <TabsContent value="discussed" className="mt-0">
            {loading ? (
              <div className="text-center py-6">Loading...</div>
            ) : (
              <AgendaItemList
                items={filteredItems}
                loading={loading}
                showActions={false}
                emptyMessage="No discussed agenda items"
                emptyDescription="Items marked as discussed will appear here."
              />
            )}
          </TabsContent>
          
          <TabsContent value="all" className="mt-0">
            {loading ? (
              <div className="text-center py-6">Loading...</div>
            ) : (
              <AgendaItemList
                items={filteredItems}
                loading={loading}
                onComplete={handleMarkDiscussed}
                emptyMessage="No agenda items found"
                emptyDescription="All agenda items for this team member will appear here."
              />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Add Agenda Item Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to 1:1 Agenda</DialogTitle>
          </DialogHeader>
          <AgendaItemForm
            teamMemberId={teamMemberId}
            onSubmit={handleAgendaItemSubmit}
            onCancel={() => setShowAddForm(false)}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AgendaSection;