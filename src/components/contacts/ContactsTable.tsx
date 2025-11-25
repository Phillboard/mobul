import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useContacts, useBulkDeleteContacts } from "@/hooks/useContacts";
import { useTablePreferences } from "@/hooks/useTablePreferences";
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
import { ColumnSelector } from "./ColumnSelector";
import { Mail, Phone, Eye, MapPin, Briefcase, Calendar } from "lucide-react";
import type { ContactFilters } from "@/types/contacts";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { format } from "date-fns";

interface ContactsTableProps {
  filters?: ContactFilters;
}

export function ContactsTable({ filters }: ContactsTableProps) {
  const navigate = useNavigate();
  const { data: contacts = [], isLoading } = useContacts(filters);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const { preferences, updatePreferences } = useTablePreferences("contacts");

  const visibleColumns = useMemo(() => preferences.visible_columns, [preferences]);

  const handleColumnsChange = (columns: string[]) => {
    updatePreferences({ visible_columns: columns, column_order: columns });
  };

  const renderCell = (contact: any, columnId: string) => {
    const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "Unnamed";
    
    switch (columnId) {
      case "customer_code":
        return (
          <Badge variant="secondary" className="font-mono text-xs">
            {contact.customer_code}
          </Badge>
        );
      case "name":
        return (
          <div>
            <div className="font-medium">{fullName}</div>
            {contact.company && (
              <div className="text-sm text-muted-foreground">{contact.company}</div>
            )}
          </div>
        );
      case "email":
        return contact.email ? (
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3 text-muted-foreground" />
            <span className="truncate max-w-[200px]">{contact.email}</span>
          </div>
        ) : null;
      case "phone":
        return contact.phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-muted-foreground" />
            {contact.phone}
          </div>
        ) : null;
      case "mobile_phone":
        return contact.mobile_phone ? (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-muted-foreground" />
            {contact.mobile_phone}
          </div>
        ) : null;
      case "company":
        return contact.company ? (
          <div className="flex items-center gap-2">
            <Briefcase className="h-3 w-3 text-muted-foreground" />
            {contact.company}
          </div>
        ) : null;
      case "job_title":
        return contact.job_title || null;
      case "address":
        return contact.address ? (
          <div className="flex items-start gap-2">
            <MapPin className="h-3 w-3 text-muted-foreground mt-0.5" />
            <span className="text-sm">{contact.address}</span>
          </div>
        ) : null;
      case "city":
        return contact.city || null;
      case "state":
        return contact.state || null;
      case "lifecycle_stage":
        return <Badge variant="outline">{contact.lifecycle_stage}</Badge>;
      case "lead_score":
        return contact.lead_score !== null ? (
          <span className="font-medium">{contact.lead_score}</span>
        ) : null;
      case "lead_source":
        return contact.lead_source || null;
      case "last_activity_date":
        return contact.last_activity_date ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {format(new Date(contact.last_activity_date), "MMM d, yyyy")}
          </div>
        ) : null;
      case "created_at":
        return contact.created_at ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {format(new Date(contact.created_at), "MMM d, yyyy")}
          </div>
        ) : null;
      default:
        return null;
    }
  };

  const getColumnLabel = (columnId: string): string => {
    const labels: Record<string, string> = {
      customer_code: "Code",
      name: "Name",
      email: "Email",
      phone: "Phone",
      mobile_phone: "Mobile",
      company: "Company",
      job_title: "Job Title",
      address: "Address",
      city: "City",
      state: "State",
      lifecycle_stage: "Stage",
      lead_score: "Score",
      lead_source: "Source",
      last_activity_date: "Last Activity",
      created_at: "Created",
    };
    return labels[columnId] || columnId;
  };

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
      <div className="flex items-center justify-between">
        {selectedIds.length > 0 && (
          <ContactBulkActions
            selectedIds={selectedIds}
            onComplete={() => setSelectedIds([])}
          />
        )}
        <div className="ml-auto">
          <ColumnSelector
            visibleColumns={visibleColumns}
            onColumnsChange={handleColumnsChange}
          />
        </div>
      </div>

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
              {visibleColumns.map((columnId) => (
                <TableHead key={columnId}>
                  {getColumnLabel(columnId)}
                </TableHead>
              ))}
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow key={contact.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedIds.includes(contact.id)}
                    onCheckedChange={() => toggleSelection(contact.id)}
                  />
                </TableCell>
                {visibleColumns.map((columnId) => (
                  <TableCell key={columnId}>
                    {renderCell(contact, columnId)}
                  </TableCell>
                ))}
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
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
