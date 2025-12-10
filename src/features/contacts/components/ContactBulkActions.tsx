import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { useBulkDeleteContacts } from '@/features/contacts/hooks';
import { useContactLists, useAddContactsToList, useCreateContactList } from '@/features/contacts/hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Trash2, ListPlus, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { useTenant } from '@app/providers/TenantProvider';

interface ContactBulkActionsProps {
  selectedIds: string[];
  onComplete: () => void;
}

export function ContactBulkActions({
  selectedIds,
  onComplete,
}: ContactBulkActionsProps) {
  const { currentClient } = useTenant();
  const { data: lists = [] } = useContactLists("static");
  const bulkDelete = useBulkDeleteContacts();
  const addToList = useAddContactsToList();
  const createList = useCreateContactList();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createListDialogOpen, setCreateListDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [newListDescription, setNewListDescription] = useState("");

  const handleDelete = async () => {
    await bulkDelete.mutateAsync(selectedIds);
    setDeleteDialogOpen(false);
    onComplete();
  };

  const handleAddToList = async () => {
    if (!selectedList) return;
    await addToList.mutateAsync({ listId: selectedList, contactIds: selectedIds });
    setSelectedList("");
    onComplete();
  };

  const handleCreateList = async () => {
    if (!newListName) return;
    
    try {
      const newList = await createList.mutateAsync({
        name: newListName,
        description: newListDescription,
        list_type: "static",
      });

      // Add selected contacts to the newly created list
      await addToList.mutateAsync({ 
        listId: newList.id, 
        contactIds: selectedIds 
      });

      setNewListName("");
      setNewListDescription("");
      setCreateListDialogOpen(false);
      onComplete();
    } catch (error) {
      console.error("Error creating list:", error);
    }
  };

  const handleSelectChange = (value: string) => {
    if (value === "create-new") {
      setCreateListDialogOpen(true);
    } else {
      setSelectedList(value);
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {selectedIds.length} selected
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-2">
          <Select value={selectedList} onValueChange={handleSelectChange}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Add to list..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="create-new" className="text-primary">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create New List
                </div>
              </SelectItem>
              {lists.length > 0 && (
                <div className="border-t my-1" />
              )}
              {lists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedList || addToList.isPending}
            onClick={handleAddToList}
          >
            <ListPlus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeleteDialogOpen(true)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contacts</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} contact(s)? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={createListDialogOpen} onOpenChange={setCreateListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>
              Create a new list and add {selectedIds.length} selected contact(s) to it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="list-name">List Name</Label>
              <Input
                id="list-name"
                placeholder="e.g., Q2 Campaign, New Leads..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="list-description">Description (Optional)</Label>
              <Textarea
                id="list-description"
                placeholder="Brief description of this list..."
                value={newListDescription}
                onChange={(e) => setNewListDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateListDialogOpen(false);
                setNewListName("");
                setNewListDescription("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateList}
              disabled={!newListName || createList.isPending}
            >
              {createList.isPending ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
