/**
 * Automation List Component
 * 
 * Displays a list of marketing automations with filtering and actions.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Switch } from "@/shared/components/ui/switch";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/shared/components/ui/dropdown-menu";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { 
  Plus, Search, MoreHorizontal, Zap, Mail, MessageSquare, 
  Copy, Trash2, Edit, Eye, Gift, FileText, UserCheck
} from "lucide-react";
import { 
  useMarketingAutomations, 
  useDeleteAutomation,
  useToggleAutomation
} from "../hooks/useMarketingAutomations";
import type { MarketingAutomation, TriggerType } from "../types";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";

const triggerLabels: Record<TriggerType, string> = {
  mail_campaign_sent: 'Mail Campaign Sent',
  mail_campaign_delivered: 'Mail Delivered',
  gift_card_redeemed: 'Gift Card Redeemed',
  form_submitted: 'Form Submitted',
  recipient_approved: 'Recipient Approved',
  manual: 'Manual Trigger',
};

const triggerIcons: Record<TriggerType, React.ReactNode> = {
  mail_campaign_sent: <Mail className="h-4 w-4" />,
  mail_campaign_delivered: <Mail className="h-4 w-4" />,
  gift_card_redeemed: <Gift className="h-4 w-4" />,
  form_submitted: <FileText className="h-4 w-4" />,
  recipient_approved: <UserCheck className="h-4 w-4" />,
  manual: <Zap className="h-4 w-4" />,
};

export function AutomationList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: automations = [], isLoading } = useMarketingAutomations({
    search: search || undefined,
    is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
  });
  
  const deleteMutation = useDeleteAutomation();
  const toggleMutation = useToggleAutomation();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const handleToggle = (automation: MarketingAutomation) => {
    toggleMutation.mutate({ id: automation.id, isActive: !automation.is_active });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Automations</CardTitle>
          <Button onClick={() => navigate('/marketing/automations/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Automation
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search automations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : automations.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No automations found</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Create your first automation workflow'
              }
            </p>
            {!search && statusFilter === 'all' && (
              <Button onClick={() => navigate('/marketing/automations/new')}>
                Create Automation
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Automation</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automations.map((automation) => (
                <TableRow 
                  key={automation.id} 
                  className="cursor-pointer"
                  onClick={() => navigate(`/marketing/automations/${automation.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Zap className={`h-4 w-4 ${automation.is_active ? 'text-yellow-500' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="font-medium">{automation.name}</div>
                        {automation.description && (
                          <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {automation.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {triggerIcons[automation.trigger_type]}
                      <span className="text-sm">{triggerLabels[automation.trigger_type]}</span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={automation.is_active}
                        onCheckedChange={() => handleToggle(automation)}
                      />
                      <span className="text-sm">
                        {automation.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{automation.total_enrolled.toLocaleString()}</TableCell>
                  <TableCell>{automation.total_completed.toLocaleString()}</TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(automation.created_at), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/marketing/automations/${automation.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/marketing/automations/${automation.id}/edit`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeleteId(automation.id)}
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
        )}
      </CardContent>
      
      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This will stop all active enrollments.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
