/**
 * Call Log Table Column Definitions
 * Type-safe column configuration for TanStack Table
 */
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ExternalLink } from "lucide-react";
import { CallRecordingPlayer } from "./CallRecordingPlayer";
import { formatRelative, formatDate, DATE_FORMATS } from '@shared/utils/date';

export interface CallSessionRow {
  id: string;
  call_started_at: string;
  caller_phone: string;
  match_status: string;
  call_status: string;
  call_duration_seconds: number | null;
  recording_url: string | null;
  recording_sid: string | null;
  recipient: {
    id: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  tracked_number: {
    phone_number: string;
  } | null;
  conditions: Array<{ count: number }>;
}

const getMatchStatusBadge = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    matched: "default",
    unmatched: "secondary",
    pending: "outline",
  };
  return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
};

const getCallStatusBadge = (status: string) => {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    completed: "default",
    busy: "secondary",
    failed: "destructive",
    "no-answer": "outline",
  };
  return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
};

export function createCallLogColumns(
  onViewRecipient: (id: string) => void
): ColumnDef<CallSessionRow>[] {
  return [
    {
      accessorKey: "call_started_at",
      header: "Call Date",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">
            {formatDate(row.getValue("call_started_at"), DATE_FORMATS.SHORT)}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatRelative(row.getValue("call_started_at"))}
          </div>
        </div>
      ),
      sortingFn: "datetime",
    },
    {
      accessorKey: "caller_phone",
      header: "Caller",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("caller_phone")}</div>
      ),
    },
    {
      accessorKey: "match_status",
      header: "Match",
      cell: ({ row }) => getMatchStatusBadge(row.getValue("match_status")),
      filterFn: "equals",
    },
    {
      id: "recipient",
      header: "Recipient",
      accessorFn: (row) =>
        row.recipient
          ? `${row.recipient.first_name || ""} ${row.recipient.last_name || ""}`.trim()
          : "-",
      cell: ({ row }) => {
        const recipient = row.original.recipient;
        if (!recipient) return <span className="text-muted-foreground">-</span>;
        
        return (
          <div className="flex items-center gap-2">
            <span>
              {recipient.first_name} {recipient.last_name}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewRecipient(recipient.id)}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: "call_duration_seconds",
      header: "Duration",
      cell: ({ row }) => {
        const duration = row.getValue("call_duration_seconds") as number | null;
        if (!duration) return <span className="text-muted-foreground">-</span>;
        
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return <span>{minutes}m {seconds}s</span>;
      },
      sortingFn: "basic",
    },
    {
      accessorKey: "call_status",
      header: "Status",
      cell: ({ row }) => getCallStatusBadge(row.getValue("call_status")),
      filterFn: "equals",
    },
    {
      id: "conditions_met",
      header: "Conditions",
      accessorFn: (row) => row.conditions?.[0]?.count || 0,
      cell: ({ row }) => {
        const count = row.original.conditions?.[0]?.count || 0;
        return (
          <Badge variant={count > 0 ? "default" : "outline"}>
            {count} met
          </Badge>
        );
      },
    },
    {
      id: "recording",
      header: "Recording",
      cell: ({ row }) => {
        if (!row.original.recording_url || !row.original.recording_sid) {
          return <span className="text-muted-foreground text-sm">No recording</span>;
        }
        
        return (
          <CallRecordingPlayer
            recordingUrl={row.original.recording_url}
            callSid={row.original.recording_sid}
          />
        );
      },
      enableSorting: false,
    },
  ];
}
