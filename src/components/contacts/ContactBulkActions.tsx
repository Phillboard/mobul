import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useBulkDeleteContacts } from "@/hooks/useContacts";
import { useContactLists, useAddContactsToList } from "@/hooks/useContactLists";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, ListPlus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContactBulkActionsProps {
  selectedIds: string[];
  onComplete: () => void;
}

export function ContactBulkActions({
  selectedIds,
  onComplete,
}: ContactBulkActionsProps) {
  const { data: lists = [] } = useContactLists("static");
  const bulkDelete = useBulkDeleteContacts();
  const addToList = useAddContactsToList();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedList, setSelectedList] = useState<string>("");

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

  return (
    <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
      <span className="text-sm font-medium">
        {selectedIds.length} selected
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <div className="flex items-center gap-2">
          <Select value={selectedList} onValueChange={setSelectedList}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Add to list..." />
            </SelectTrigger>
            <SelectContent>
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
    </div>
  );
}
