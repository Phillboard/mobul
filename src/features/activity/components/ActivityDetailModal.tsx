/**
 * ActivityDetailModal Component
 * 
 * Modal for viewing full activity log details with:
 * - Full metadata view
 * - Expandable stack traces
 * - Copy to clipboard
 * - Related actions
 */

import { useState } from 'react';
import { 
  X, Copy, Check, ExternalLink, Clock, User, Globe, 
  Code, Server, ChevronDown, ChevronUp, Gift, Megaphone,
  Phone, Shield, AlertTriangle
} from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { ScrollArea } from '@/shared/components/ui/scroll-area';
import { Separator } from '@/shared/components/ui/separator';
import { cn } from '@/shared/utils/cn';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import { ActivityLog, ActivityCategory } from '../types/activity.types';
import { StatusBadge, SeverityBadge } from './ActivityTable';

interface ActivityDetailModalProps {
  log: ActivityLog | null;
  open: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<ActivityCategory, any> = {
  gift_card: Gift,
  campaign: Megaphone,
  communication: Phone,
  api: Code,
  user: User,
  system: Server,
};

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  gift_card: 'text-purple-500',
  campaign: 'text-blue-500',
  communication: 'text-green-500',
  api: 'text-orange-500',
  user: 'text-pink-500',
  system: 'text-gray-500',
};

export function ActivityDetailModal({ log, open, onClose }: ActivityDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [showRawData, setShowRawData] = useState(false);

  if (!log) return null;

  const Icon = CATEGORY_ICONS[log.category] || Server;
  const iconColor = CATEGORY_COLORS[log.category] || 'text-gray-500';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get additional fields based on category
  const getAdditionalFields = () => {
    const fields: { label: string; value: string | number | undefined; icon?: any }[] = [];

    switch (log.category) {
      case 'gift_card': {
        const gc = log as any;
        if (gc.recipient_name) fields.push({ label: 'Recipient', value: gc.recipient_name, icon: User });
        if (gc.recipient_phone) fields.push({ label: 'Phone', value: gc.recipient_phone, icon: Phone });
        if (gc.campaign_name) fields.push({ label: 'Campaign', value: gc.campaign_name, icon: Megaphone });
        if (gc.brand_name) fields.push({ label: 'Brand', value: gc.brand_name, icon: Gift });
        if (gc.amount) fields.push({ label: 'Amount', value: `$${gc.amount}` });
        break;
      }
      
      case 'campaign': {
        const camp = log as any;
        if (camp.campaign_name) fields.push({ label: 'Campaign', value: camp.campaign_name, icon: Megaphone });
        if (camp.recipients_affected) fields.push({ label: 'Recipients', value: camp.recipients_affected.toLocaleString() });
        if (camp.tracking_number) fields.push({ label: 'Tracking #', value: camp.tracking_number });
        break;
      }
      
      case 'communication': {
        const comm = log as any;
        if (comm.from_number) fields.push({ label: 'From', value: comm.from_number });
        if (comm.to_number) fields.push({ label: 'To', value: comm.to_number });
        if (comm.duration_seconds) fields.push({ label: 'Duration', value: `${Math.floor(comm.duration_seconds / 60)}:${(comm.duration_seconds % 60).toString().padStart(2, '0')}` });
        break;
      }
      
      case 'api': {
        const api = log as any;
        if (api.endpoint) fields.push({ label: 'Endpoint', value: api.endpoint, icon: Globe });
        if (api.method) fields.push({ label: 'Method', value: api.method });
        if (api.status_code) fields.push({ label: 'Status Code', value: api.status_code });
        if (api.latency_ms) fields.push({ label: 'Latency', value: `${api.latency_ms}ms` });
        if (api.api_key_name) fields.push({ label: 'API Key', value: api.api_key_name });
        break;
      }
      
      case 'user': {
        const usr = log as any;
        if (usr.target_user_email) fields.push({ label: 'Target User', value: usr.target_user_email, icon: User });
        if (usr.role) fields.push({ label: 'Role', value: usr.role, icon: Shield });
        if (usr.location) fields.push({ label: 'Location', value: usr.location, icon: Globe });
        break;
      }
      
      case 'system': {
        const sys = log as any;
        if (sys.job_name) fields.push({ label: 'Job', value: sys.job_name });
        if (sys.integration_name) fields.push({ label: 'Integration', value: sys.integration_name });
        if (sys.affected_records) fields.push({ label: 'Records Affected', value: sys.affected_records.toLocaleString() });
        break;
      }
    }

    return fields;
  };

  const additionalFields = getAdditionalFields();
  const systemLog = log.category === 'system' ? log as any : null;

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg bg-muted', iconColor)}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <span className="capitalize">{log.event_type.replace(/_/g, ' ')}</span>
                  <StatusBadge status={log.status} />
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 mt-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(log.timestamp, DATE_FORMATS.DATETIME)}
                </DialogDescription>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleCopy} title="Copy JSON">
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline" className="capitalize">
                  {log.category.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Event ID</p>
                <p className="font-mono text-xs">{log.id}</p>
              </div>

              {log.user_email && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">User</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{log.user_email}</span>
                  </div>
                </div>
              )}

              {log.ip_address && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">IP Address</p>
                  <p className="font-mono text-sm">{log.ip_address}</p>
                </div>
              )}

              {log.correlation_id && (
                <div className="space-y-1 col-span-2">
                  <p className="text-sm text-muted-foreground">Correlation ID</p>
                  <p className="font-mono text-xs">{log.correlation_id}</p>
                </div>
              )}
            </div>

            {/* Severity for System Logs */}
            {systemLog?.severity && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium">Severity</p>
                  <SeverityBadge severity={systemLog.severity} />
                </div>
              </>
            )}

            {/* System Message */}
            {systemLog?.message && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Message</p>
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm">{systemLog.message}</p>
                </div>
              </div>
            )}

            {/* Stack Trace for System Logs */}
            {systemLog?.stack_trace && (
              <div className="space-y-2">
                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                >
                  {showRawData ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Stack Trace
                </button>
                {showRawData && (
                  <pre className="p-3 rounded-lg bg-muted text-xs overflow-auto max-h-48 font-mono">
                    {systemLog.stack_trace}
                  </pre>
                )}
              </div>
            )}

            {/* Additional Fields */}
            {additionalFields.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium">Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    {additionalFields.map(({ label, value, icon: FieldIcon }) => (
                      <div key={label} className="space-y-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          {FieldIcon && <FieldIcon className="h-3 w-3" />}
                          {label}
                        </p>
                        <p className="text-sm font-medium">{value || '-'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            {log.metadata && Object.keys(log.metadata).length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="flex items-center gap-2 text-sm font-medium hover:text-primary"
                  >
                    {showRawData ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    Raw Metadata
                  </button>
                  {showRawData && (
                    <pre className="p-3 rounded-lg bg-muted text-xs overflow-auto max-h-48 font-mono">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </>
            )}

            {/* Error Details */}
            {(log as any).error_message && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-sm font-medium">Error Details</p>
                  </div>
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm text-destructive">{(log as any).error_message}</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ActivityDetailModal;
