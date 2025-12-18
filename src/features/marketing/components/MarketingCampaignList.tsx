/**
 * Marketing Campaign List Component
 * 
 * Displays a list of email/SMS marketing campaigns with filtering and actions.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuTrigger, DropdownMenuSeparator 
} from "@/shared/components/ui/dropdown-menu";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/shared/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { 
  Plus, Search, MoreHorizontal, Mail, MessageSquare, 
  Copy, Trash2, Edit, Eye, Play, Pause, X 
} from "lucide-react";
import { 
  useMarketingCampaigns, 
  useDeleteMarketingCampaign,
  useDuplicateMarketingCampaign,
  useSendMarketingCampaign,
  usePauseMarketingCampaign,
  useCancelMarketingCampaign
} from "../hooks/useMarketingCampaigns";
import type { MarketingCampaign, CampaignStatus, CampaignType } from "../types";
import { format } from "date-fns";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";

const statusColors: Record<CampaignStatus, string> = {
  draft: 'secondary',
  scheduled: 'outline',
  sending: 'default',
  sent: 'default',
  paused: 'secondary',
  cancelled: 'destructive',
};

const typeIcons: Record<CampaignType, React.ReactNode> = {
  email: <Mail className="h-4 w-4 text-blue-500" />,
  sms: <MessageSquare className="h-4 w-4 text-green-500" />,
  both: (
    <div className="flex">
      <Mail className="h-4 w-4 text-blue-500" />
      <MessageSquare className="h-4 w-4 text-green-500 -ml-1" />
    </div>
  ),
};

export function MarketingCampaignList() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const { data: campaigns = [], isLoading } = useMarketingCampaigns({
    search: search || undefined,
    status: statusFilter !== 'all' ? [statusFilter as CampaignStatus] : undefined,
    campaign_type: typeFilter !== 'all' ? [typeFilter as CampaignType] : undefined,
  });
  
  const deleteMutation = useDeleteMarketingCampaign();
  const duplicateMutation = useDuplicateMarketingCampaign();
  const sendMutation = useSendMarketingCampaign();
  const pauseMutation = usePauseMarketingCampaign();
  const cancelMutation = useCancelMarketingCampaign();

  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const getDeliveryRate = (campaign: MarketingCampaign) => {
    if (campaign.sent_count === 0) return 0;
    return Math.round((campaign.delivered_count / campaign.sent_count) * 100);
  };

  const getOpenRate = (campaign: MarketingCampaign) => {
    if (campaign.delivered_count === 0) return 0;
    return Math.round((campaign.opened_count / campaign.delivered_count) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Campaigns</CardTitle>
          <Button onClick={() => navigate('/marketing/campaigns/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>
        
        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns..."
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
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sending">Sending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="both">Email + SMS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
            <p className="text-muted-foreground mb-4">
              {search || statusFilter !== 'all' || typeFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Create your first email or SMS campaign'
              }
            </p>
            {!search && statusFilter === 'all' && typeFilter === 'all' && (
              <Button onClick={() => navigate('/marketing/campaigns/new')}>
                Create Campaign
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Delivery</TableHead>
                <TableHead>Opens</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow 
                  key={campaign.id} 
                  className="cursor-pointer"
                  onClick={() => navigate(`/marketing/campaigns/${campaign.id}`)}
                >
                  <TableCell>
                    <div className="font-medium">{campaign.name}</div>
                    {campaign.description && (
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {campaign.description}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{typeIcons[campaign.campaign_type]}</TableCell>
                  <TableCell>
                    <Badge variant={statusColors[campaign.status] as any}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{campaign.total_recipients.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={getDeliveryRate(campaign)} className="w-16 h-2" />
                      <span className="text-xs text-muted-foreground">
                        {getDeliveryRate(campaign)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {campaign.campaign_type !== 'sms' ? (
                      <span className="text-sm">{getOpenRate(campaign)}%</span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {campaign.started_at 
                        ? format(new Date(campaign.started_at), 'MMM d, yyyy')
                        : campaign.scheduled_at
                          ? format(new Date(campaign.scheduled_at), 'MMM d, yyyy')
                          : format(new Date(campaign.created_at), 'MMM d, yyyy')
                      }
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
                        <DropdownMenuItem onClick={() => navigate(`/marketing/campaigns/${campaign.id}`)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {campaign.status === 'draft' && (
                          <>
                            <DropdownMenuItem onClick={() => navigate(`/marketing/campaigns/${campaign.id}/edit`)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => sendMutation.mutate(campaign.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Send Now
                            </DropdownMenuItem>
                          </>
                        )}
                        {campaign.status === 'sending' && (
                          <DropdownMenuItem onClick={() => pauseMutation.mutate(campaign.id)}>
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        )}
                        {campaign.status === 'paused' && (
                          <DropdownMenuItem onClick={() => sendMutation.mutate(campaign.id)}>
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </DropdownMenuItem>
                        )}
                        {['draft', 'scheduled', 'sending', 'paused'].includes(campaign.status) && (
                          <DropdownMenuItem onClick={() => cancelMutation.mutate(campaign.id)}>
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate(campaign.id)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeleteId(campaign.id)}
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
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This action cannot be undone.
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
