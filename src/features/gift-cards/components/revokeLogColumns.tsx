/**
 * Revoke Log Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badge";
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { formatCurrency } from '@shared/utils/currency';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { User, Gift, MessageSquare } from "lucide-react";

export interface RevokeLogRow {
  id: string;
  recipient_gift_card_id: string | null;
  inventory_card_id: string | null;
  recipient_id: string | null;
  campaign_id: string | null;
  condition_id: string | null;
  revoked_by: string;
  revoked_at: string;
  reason: string;
  recipient_name: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  card_value: number | null;
  brand_name: string | null;
  original_delivery_status: string | null;
  created_at: string;
  // Joined data
  revoker?: {
    email?: string;
    user_metadata?: {
      full_name?: string;
    };
  };
  campaign?: {
    name?: string;
  };
}

export function createRevokeLogColumns(): ColumnDef<RevokeLogRow>[] {
  return [
    {
      accessorKey: "revoked_at",
      header: "Revoked At",
      cell: ({ row }) => (
        <span className="text-sm whitespace-nowrap">
          {formatDate(row.getValue("revoked_at"), DATE_FORMATS.LONG)}
        </span>
      ),
      sortingFn: "datetime",
    },
    {
      id: "admin",
      header: "Admin",
      cell: ({ row }) => {
        const revokedBy = row.original.revoked_by;
        return (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-mono">
              {revokedBy?.substring(0, 8)}...
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "recipient_name",
      header: "Recipient",
      cell: ({ row }) => {
        const name = row.original.recipient_name;
        const phone = row.original.recipient_phone;
        const email = row.original.recipient_email;
        
        return (
          <div>
            <div className="font-medium">{name || 'Unknown'}</div>
            {(phone || email) && (
              <div className="text-xs text-muted-foreground">
                {phone || email}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "card",
      header: "Card",
      cell: ({ row }) => {
        const value = row.original.card_value;
        const brand = row.original.brand_name;
        
        if (!value && !brand) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        return (
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-muted-foreground" />
            <div>
              {value && (
                <span className="font-semibold">{formatCurrency(value)}</span>
              )}
              {brand && (
                <span className="text-xs text-muted-foreground ml-1">
                  {brand}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "original_delivery_status",
      header: "Original Status",
      cell: ({ row }) => {
        const status = row.original.original_delivery_status;
        if (!status) return <span className="text-muted-foreground">—</span>;
        
        return (
          <Badge variant="outline" className="text-xs">
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => {
        const reason = row.original.reason;
        const maxLength = 50;
        const truncated = reason.length > maxLength;
        
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-2 max-w-[200px]">
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-sm line-clamp-2">
                    {truncated ? `${reason.substring(0, maxLength)}...` : reason}
                  </span>
                </div>
              </TooltipTrigger>
              {truncated && (
                <TooltipContent side="top" className="max-w-[300px]">
                  <p>{reason}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      id: "campaign",
      header: "Campaign",
      cell: ({ row }) => {
        const campaign = row.original.campaign;
        const campaignId = row.original.campaign_id;
        
        if (!campaign?.name && !campaignId) {
          return <span className="text-muted-foreground">—</span>;
        }
        
        return (
          <span className="text-sm">
            {campaign?.name || `ID: ${campaignId?.substring(0, 8)}...`}
          </span>
        );
      },
    },
  ];
}
