import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoreVertical, Mail, Phone, Building2, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ContactCardProps {
  contact: any;
  onViewDetails: () => void;
  onEdit: () => void;
  onSendEmail: () => void;
  onCall: () => void;
  onDelete: () => void;
  lifecycleColors: Record<string, string>;
}

export function ContactCard({
  contact,
  onViewDetails,
  onEdit,
  onSendEmail,
  onCall,
  onDelete,
  lifecycleColors,
}: ContactCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onViewDetails}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">
              {contact.first_name} {contact.last_name}
            </h3>
            {contact.lifecycle_stage && (
              <Badge className={`${lifecycleColors[contact.lifecycle_stage] || ''} mt-1`}>
                {contact.lifecycle_stage}
              </Badge>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
                <User className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSendEmail(); }}>
                <Mail className="h-4 w-4 mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCall(); }}>
                <Phone className="h-4 w-4 mr-2" />
                Call
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          {contact.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.company && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="truncate">{contact.company}</span>
            </div>
          )}
          {contact.lead_score && (
            <div className="flex items-center gap-2">
              <span className="font-medium">Score: {contact.lead_score}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
