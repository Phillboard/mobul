import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Mail } from "lucide-react";
import { GenerateQRCodesDialog } from "./GenerateQRCodesDialog";
import { CampaignProofDialog } from "./CampaignProofDialog";
import { DeleteCampaignDialog } from "./DeleteCampaignDialog";
import { CampaignCard } from "./CampaignCard";
import { useNavigate } from "react-router-dom";
import { useToast } from '@shared/hooks';
import { useIsMobile } from '@shared/hooks';
import { useReactTable, getCoreRowModel, getSortedRowModel, getFilteredRowModel, getPaginationRowModel, SortingState, ColumnFiltersState } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/ui/data-table";
import { DataTablePagination } from "@/shared/components/ui/data-table-pagination";
import { DataTableToolbar } from "@/shared/components/ui/data-table-toolbar";
import { DataTableViewOptions } from "@/shared/components/ui/data-table-view-options";
import { createCampaignsColumns, CampaignRow } from "./campaignsColumns";

interface CampaignsListProps {
  clientId: string;
  searchQuery: string;
}

export function CampaignsList({ clientId, searchQuery }: CampaignsListProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [proofCampaignId, setProofCampaignId] = useState<string | null>(null);
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const submitToVendorMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('submit-to-vendor', {
        body: { campaignId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", clientId] });
      toast({
        title: "Submitted to Vendor",
        description: `Created ${data.batchCount} print batches. Estimated completion: ${new Date(data.estimatedCompletion).toLocaleDateString()}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const duplicateCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      // Get original campaign
      const { data: original, error: fetchError } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", campaignId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Create copy with new name
      const { data: newCampaign, error: createError } = await supabase
        .from("campaigns")
        .insert({
          ...original,
          id: undefined,
          name: `${original.name} (Copy)`,
          status: 'draft',
          audience_id: null, // Don't copy audience
          created_at: undefined,
          updated_at: undefined,
        })
        .select()
        .single();
      
      if (createError) throw createError;
      
      // Copy conditions if any
      const { data: conditions } = await supabase
        .from("campaign_conditions")
        .select("*")
        .eq("campaign_id", campaignId);
      
      if (conditions && conditions.length > 0) {
        const newConditions = conditions.map(c => ({
          ...c,
          id: undefined,
          campaign_id: newCampaign.id,
          created_at: undefined,
        }));
        
        await supabase.from("campaign_conditions").insert(newConditions);
      }
      
      return newCampaign;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", clientId] });
      toast({
        title: "Campaign Duplicated",
        description: `Created "${data.name}". You can now edit and configure it.`,
      });
      navigate(`/campaigns/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Duplication Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from("campaigns")
        .delete()
        .eq("id", campaignId);
      
      if (error) throw error;
      return campaignId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["campaigns", clientId] });
      toast({
        title: "Campaign Deleted",
        description: "Campaign has been permanently deleted.",
      });
      setDeleteCampaignId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns", clientId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select(`
          *,
          contact_lists (
            name,
            contact_count
          ),
          audiences (
            name,
            valid_count
          ),
          templates (
            name
          )
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`);
      }

      const { data: campaignsData, error } = await query;
      if (error) throw error;

      // Fetch call sessions and conditions for each campaign
      const enrichedCampaigns = await Promise.all(
        (campaignsData || []).map(async (campaign) => {
          // Get call sessions count
          const { count: callsCount } = await supabase
            .from('call_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          // Get conditions met (rewards) count
          const { count: rewardsCount } = await supabase
            .from('call_conditions_met')
            .select('*', { count: 'exact', head: true })
            .eq('campaign_id', campaign.id);

          // Calculate conversion rate
          const conversionRate = callsCount && callsCount > 0 
            ? ((rewardsCount || 0) / callsCount) * 100 
            : 0;

          return {
            ...campaign,
            callSessionCount: callsCount || 0,
            rewardCount: rewardsCount || 0,
            conversionRate,
          };
        })
      );

      return enrichedCampaigns as CampaignRow[];
    },
  });

  const columns = useMemo(
    () =>
      createCampaignsColumns({
        onViewDetails: (id) => navigate(`/campaigns/${id}`),
        onViewAnalytics: (id) => navigate(`/analytics/${id}`),
        onReviewProof: (id) => setProofCampaignId(id),
        onSubmitToVendor: (id) => submitToVendorMutation.mutate(id),
        onEdit: (id) => navigate(`/campaigns/${id}/edit`),
        onDuplicate: (id) => duplicateCampaignMutation.mutate(id),
        onDelete: (id) => setDeleteCampaignId(id),
      }),
    [navigate, submitToVendorMutation]
  );

  const table = useReactTable({
    data: campaigns || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: {
      sorting,
      columnFilters,
    },
  });

  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading campaigns...</div>;
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
        <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold text-foreground">No campaigns yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your first direct mail campaign to get started
        </p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary";
      case "scheduled":
        return "default";
      case "printing":
        return "default";
      case "mailed":
        return "default";
      case "completed":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <>
      {isMobile ? (
        <div className="space-y-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onViewDetails={() => navigate(`/campaigns/${campaign.id}`)}
              onViewAnalytics={() => navigate(`/analytics/${campaign.id}`)}
              onReviewProof={() => setProofCampaignId(campaign.id)}
              onSubmitToVendor={() => submitToVendorMutation.mutate(campaign.id)}
              onEdit={() => navigate(`/campaigns/${campaign.id}/edit`)}
              onDuplicate={() => duplicateCampaignMutation.mutate(campaign.id)}
              onDelete={() => setDeleteCampaignId(campaign.id)}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <DataTableToolbar 
            table={table} 
            searchKey="name"
            searchPlaceholder="Search campaigns..."
          >
            <DataTableViewOptions table={table} />
          </DataTableToolbar>
          <DataTable table={table} />
          <DataTablePagination table={table} />
        </div>
      )}

    {selectedCampaign && (
      <GenerateQRCodesDialog
        open={!!selectedCampaign}
        onOpenChange={(open) => !open && setSelectedCampaign(null)}
        campaignId={selectedCampaign.id}
        campaignName={selectedCampaign.name}
      />
    )}

    {proofCampaignId && (
      <CampaignProofDialog
        open={!!proofCampaignId}
        onOpenChange={(open) => !open && setProofCampaignId(null)}
        campaignId={proofCampaignId}
      />
    )}
    
    {deleteCampaignId && (
      <DeleteCampaignDialog
        open={!!deleteCampaignId}
        onOpenChange={(open) => !open && setDeleteCampaignId(null)}
        campaignId={deleteCampaignId}
        onConfirm={() => deleteCampaignMutation.mutate(deleteCampaignId)}
      />
    )}
    </>
  );
}
