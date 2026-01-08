import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download, Printer } from 'lucide-react';
import { PersonalFileItem } from '@/api/oneOnOneAgenda';
import PersonalFileItemForm from '@/components/agenda/PersonalFileItemForm';
import PersonalFileList from '@/components/agenda/PersonalFileList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { printPersonalFile, exportPersonalFileToPDF } from '@/services/printService';

/**
 * PersonalFileSection - Container component for managing personal file items
 * 
 * @param {Object} props
 * @param {string} props.teamMemberId - ID of the team member
 * @param {string} props.teamMemberName - Name of the team member
 */
const PersonalFileSection = ({ teamMemberId, teamMemberName }) => {
  const [personalFileItems, setPersonalFileItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadPersonalFileItems();
  }, [teamMemberId]);

  const loadPersonalFileItems = async () => {
    setLoading(true);
    try {
      const items = await PersonalFileItem.getByTeamMember(teamMemberId);
      setPersonalFileItems(items);
    } catch (error) {
      console.error('Error loading personal file items:', error);
      toast.error('Failed to load personal file items');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalFileItemSubmit = async () => {
    setShowAddForm(false);
    setEditingItem(null);
    await loadPersonalFileItems();
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowAddForm(true);
  };

  const handleDelete = async (item) => {
    if (window.confirm('Are you sure you want to delete this personal file item?')) {
      try {
        await PersonalFileItem.delete(item.id);
        toast.success('Personal file item deleted');
        await loadPersonalFileItems();
      } catch (error) {
        console.error('Error deleting personal file item:', error);
        toast.error('Failed to delete personal file item');
      }
    }
  };

  const handleExport = () => {
    try {
      exportPersonalFileToPDF(personalFileItems, teamMemberName);
      toast.success('Personal file exported successfully');
    } catch (error) {
      console.error('Error exporting personal file:', error);
      toast.error('Failed to export personal file');
    }
  };

  const handlePrint = () => {
    try {
      printPersonalFile(personalFileItems, teamMemberName);
      toast.success('Opening print preview...');
    } catch (error) {
      console.error('Error printing personal file:', error);
      toast.error('Failed to open print preview');
    }
  };

  const filteredItems = personalFileItems.filter(item => {
    if (activeTab === 'all') return true;
    return item.category === activeTab;
  });

  const categories = [...new Set(personalFileItems.map(item => item.category))].sort();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Personal File</CardTitle>
        <div className="flex gap-2">
          {personalFileItems.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={handleExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Export as Text
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Preview
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="grid-cols-auto">
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.map(category => (
                <TabsTrigger key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          
          <TabsContent value="all" className="mt-0">
            <PersonalFileList
              items={filteredItems}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              emptyMessage="No personal file items found"
              emptyDescription="Add items to build a comprehensive performance record."
            />
          </TabsContent>
          
          {categories.map(category => (
            <TabsContent key={category} value={category} className="mt-0">
              <PersonalFileList
                items={filteredItems}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                emptyMessage={`No ${category} items found`}
                emptyDescription={`Items categorized as ${category} will appear here.`}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>

      {/* Add/Edit Personal File Item Dialog */}
      <Dialog open={showAddForm} onOpenChange={(open) => {
        setShowAddForm(open);
        if (!open) {
          setEditingItem(null);
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Personal File Item' : 'Add to Personal File'}
            </DialogTitle>
          </DialogHeader>
          <PersonalFileItemForm
            teamMemberId={teamMemberId}
            initialData={editingItem}
            onSubmit={handlePersonalFileItemSubmit}
            onCancel={() => {
              setShowAddForm(false);
              setEditingItem(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default PersonalFileSection;