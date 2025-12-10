import { useState } from "react";
import { useCreateContactList } from '@/features/contacts/hooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Info } from "lucide-react";

interface SegmentBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SegmentBuilder({ open, onOpenChange }: SegmentBuilderProps) {
  const createList = useCreateContactList();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createList.mutateAsync({
      name,
      description,
      list_type: "dynamic",
      filter_rules: {}, // Placeholder for future rule builder
    });
    onOpenChange(false);
    setName("");
    setDescription("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Segment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Dynamic segments automatically update based on rules. Advanced rule
                builder coming soon.
              </AlertDescription>
            </Alert>

            <div>
              <Label htmlFor="name">Segment Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="High Lead Score Prospects"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Contacts with lead score > 80"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createList.isPending}>
              {createList.isPending ? "Creating..." : "Create Segment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
