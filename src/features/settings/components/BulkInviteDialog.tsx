/**
 * BulkInviteDialog
 * 
 * Dialog for inviting multiple users at once via CSV or text input.
 */

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { useToast } from '@shared/hooks';
import { 
  Upload, 
  Loader2, 
  Users, 
  CheckCircle, 
  XCircle,
  FileSpreadsheet,
  Info
} from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import Papa from "papaparse";

interface BulkInviteDialogProps {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InviteResult {
  email: string;
  success: boolean;
  error?: string;
}

const ROLE_OPTIONS = [
  { value: 'company_owner', label: 'Company Owner', description: 'Full access to client data' },
  { value: 'call_center', label: 'Call Center Agent', description: 'Access to redemption center only' },
];

export function BulkInviteDialog({
  clientId,
  open,
  onOpenChange,
}: BulkInviteDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("call_center");
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [customMessage, setCustomMessage] = useState("");

  const inviteMutation = useMutation({
    mutationFn: async (emailList: string[]) => {
      const results: InviteResult[] = [];
      
      for (const email of emailList) {
        try {
          const { error } = await supabase.functions.invoke('send-user-invitation', {
            body: {
              email: email.trim(),
              role,
              clientId,
              customMessage: customMessage || undefined,
            },
          });

          if (error) {
            results.push({ email, success: false, error: error.message });
          } else {
            results.push({ email, success: true });
          }
        } catch (err: any) {
          results.push({ email, success: false, error: err.message || 'Unknown error' });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setResults(results);
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      toast({
        title: 'Invitations Sent',
        description: `${successCount} sent, ${failCount} failed`,
        variant: failCount > 0 ? 'default' : 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Invitation Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        const emailList = results.data
          .map((row: any) => {
            if (Array.isArray(row)) return row[0];
            return row.email || row.Email || row.EMAIL || Object.values(row)[0];
          })
          .filter((email: any) => 
            email && 
            typeof email === 'string' && 
            email.includes('@') && 
            email.trim().length > 0
          );

        setEmails(emailList.join('\n'));
        
        toast({
          title: 'CSV Loaded',
          description: `Found ${emailList.length} email addresses`,
        });
      },
      error: (error) => {
        toast({
          title: 'CSV Error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });

    event.target.value = '';
  };

  const handleInvite = () => {
    const emailList = emails
      .split(/[\n,;]/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@') && e.length > 0);

    if (emailList.length === 0) {
      toast({
        title: 'No Emails',
        description: 'Please enter at least one email address',
        variant: 'destructive',
      });
      return;
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(emailList)];

    if (uniqueEmails.length > 50) {
      toast({
        title: 'Too Many Emails',
        description: 'Maximum 50 invitations per batch',
        variant: 'destructive',
      });
      return;
    }

    inviteMutation.mutate(uniqueEmails);
  };

  const handleClose = () => {
    setEmails("");
    setResults(null);
    setCustomMessage("");
    onOpenChange(false);
  };

  const emailCount = emails
    .split(/[\n,;]/)
    .filter(e => e.trim().includes('@')).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Invite Users
          </DialogTitle>
          <DialogDescription>
            Invite multiple team members at once. They'll receive an email with setup instructions.
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-4 py-4">
            {/* Role Selection */}
            <div className="space-y-2">
              <Label>Role for All Invitees</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Addresses</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload">
                    <Button variant="outline" size="sm" asChild className="cursor-pointer">
                      <span>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Upload CSV
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
              <Textarea
                placeholder="Enter email addresses (one per line, or comma/semicolon separated)&#10;&#10;john@example.com&#10;jane@example.com&#10;mike@example.com"
                value={emails}
                onChange={(e) => setEmails(e.target.value)}
                className="min-h-[120px] font-mono text-sm"
              />
              {emailCount > 0 && (
                <div className="text-xs text-muted-foreground">
                  {emailCount} email{emailCount !== 1 ? 's' : ''} to invite
                </div>
              )}
            </div>

            {/* Custom Message */}
            <div className="space-y-2">
              <Label htmlFor="customMessage">
                Custom Welcome Message <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="customMessage"
                placeholder="Add a personal message to the invitation email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={2}
              />
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Invites are valid for 7 days. You can resend invitations from the team management page.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Results Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">
                    {results.filter(r => r.success).length}
                  </div>
                </div>
                <div className="text-sm text-green-700">Sent Successfully</div>
              </div>
              <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">
                    {results.filter(r => !r.success).length}
                  </div>
                </div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            </div>

            {/* Failed Invites */}
            {results.filter(r => !r.success).length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-red-600">Failed Invitations</Label>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {results.filter(r => !r.success).map((result, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded text-sm">
                      <span className="font-mono">{result.email}</span>
                      <span className="text-xs text-red-600">{result.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success List */}
            {results.filter(r => r.success).length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-600">Invitations Sent</Label>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {results.filter(r => r.success).map((result, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {result.email}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!results ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleInvite} 
                disabled={inviteMutation.isPending || emailCount === 0}
              >
                {inviteMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Send {emailCount} Invitation{emailCount !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

