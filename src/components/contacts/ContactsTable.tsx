import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Mail, Phone, Edit, Trash2, ExternalLink } from "lucide-react";
import { Contact } from "@/hooks/useContacts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactCard } from "./ContactCard";
import { useIsMobile } from "@/hooks/use-mobile";

interface ContactsTableProps {
  contacts: Contact[];
  isLoading: boolean;
}

const lifecycleColors: Record<string, string> = {
  subscriber: "bg-gray-500",
  lead: "bg-blue-500",
  mql: "bg-purple-500",
  sql: "bg-indigo-500",
  opportunity: "bg-yellow-500",
  customer: "bg-green-500",
  evangelist: "bg-pink-500",
};

export function ContactsTable({ contacts, isLoading }: ContactsTableProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <Card variant="glass">
        <div className="p-4 md:p-6 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shimmer-effect h-20 md:h-12 w-full rounded-md bg-muted/50" />
          ))}
        </div>
      </Card>
    );
  }

  if (contacts.length === 0) {
    return (
      <Card variant="glass">
        <div className="p-8 md:p-12 text-center">
          <p className="text-muted-foreground">No contacts found</p>
          <p className="text-sm text-muted-foreground mt-2">
            Create your first contact or import from CSV
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="overflow-hidden">
      {isMobile ? (
        <div className="p-4 space-y-3">
          {contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onViewDetails={() => navigate(`/contacts/${contact.id}`)}
              onEdit={() => {}}
              onSendEmail={() => {}}
              onCall={() => {}}
              onDelete={() => {}}
              lifecycleColors={lifecycleColors}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30 backdrop-blur-sm">
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Email</TableHead>
              <TableHead className="font-semibold">Phone</TableHead>
              <TableHead className="font-semibold">Company</TableHead>
              <TableHead className="font-semibold">Lifecycle Stage</TableHead>
              <TableHead className="font-semibold">Lead Score</TableHead>
              <TableHead className="font-semibold">Source</TableHead>
              <TableHead className="text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contacts.map((contact) => (
              <TableRow
                key={contact.id}
                className="cursor-pointer hover:bg-primary/5 hover:shadow-glow-sm transition-all duration-200 group border-border/50"
                onClick={() => navigate(`/contacts/${contact.id}`)}
              >
              <TableCell className="font-medium">
                {contact.first_name} {contact.last_name}
                {contact.do_not_contact && (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    DNC
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {contact.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {contact.email}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {contact.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {contact.phone}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {contact.companies?.company_name}
              </TableCell>
              <TableCell>
                <Badge
                  className={lifecycleColors[contact.lifecycle_stage] || "bg-gray-500"}
                >
                  {contact.lifecycle_stage.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${contact.lead_score}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {contact.lead_score}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {contact.sync_source}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/contacts/${contact.id}`);
                    }}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    {contact.email && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `mailto:${contact.email}`;
                      }}>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                    )}
                    {contact.phone && (
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `tel:${contact.phone}`;
                      }}>
                        <Phone className="h-4 w-4 mr-2" />
                        Call
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={(e) => e.stopPropagation()}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
      )}
    </Card>
  );
}
