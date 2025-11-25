import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContacts, useBulkDeleteContacts } from "@/hooks/useContacts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContactBulkActions } from "./ContactBulkActions";
import { Mail, Phone, Eye } from "lucide-react";
import type { ContactFilters } from "@/types/contacts";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";

interface ContactsTableProps {
  filters?: ContactFilters;
}

export function ContactsTable({ filters }: ContactsTableProps) {
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts(filters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === contacts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(contacts.map((c) => c.id));
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading contacts...</div>;
  }

  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No contacts found"
        description="Get started by creating your first contact or importing from CSV."
      />
    );
  }

  return (
    <div className="space-y-4">
      {selectedIds.length > 0 && (
        <ContactBulkActions
          selectedIds={selectedIds}
          onComplete={() => setSelectedIds([])}
        />
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === contacts.length}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Score</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => {
              const fullName =
                [contact.first_name, contact.last_name].filter(Boolean).join(" ") ||
                "Unnamed";

              return (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(contact.id)}
                      onCheckedChange={() => toggleSelection(contact.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>
                      <div>{fullName}</div>
                      {contact.company && (
                        <div className="text-sm text-muted-foreground">
                          {contact.company}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {contact.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {contact.email}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {contact.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {contact.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{contact.lifecycle_stage}</Badge>
                  </TableCell>
                  <TableCell>
                    {contact.lead_score !== null && (
                      <span className="font-medium">{contact.lead_score}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/contacts/${contact.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
