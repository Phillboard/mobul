import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreVertical, Mail, Calendar, Users, QrCode } from "lucide-react";
import { GenerateQRCodesDialog } from "./GenerateQRCodesDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface CampaignsListProps {
  clientId: string;
  searchQuery: string;
}

export function CampaignsList({ clientId, searchQuery }: CampaignsListProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ["campaigns", clientId, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("campaigns")
        .select(`
          *,
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

      const { data, error } = await query;

      if (error) throw error;
      return data;
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
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Campaign Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Audience</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Mail Date</TableHead>
          <TableHead>Postage</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => (
          <TableRow key={campaign.id}>
            <TableCell>
              <div className="space-y-1">
                <div className="font-medium">{campaign.name}</div>
                {campaign.templates && (
                  <div className="text-xs text-muted-foreground">
                    Template: {campaign.templates.name}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={getStatusColor(campaign.status)}>
                {getStatusLabel(campaign.status)}
              </Badge>
            </TableCell>
            <TableCell>
              {campaign.audiences ? (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {campaign.audiences.name}
                    <span className="text-muted-foreground ml-1">
                      ({campaign.audiences.valid_count})
                    </span>
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">No audience</span>
              )}
            </TableCell>
            <TableCell>
              <div className="text-sm">{campaign.size?.toUpperCase()}</div>
            </TableCell>
            <TableCell>
              {campaign.mail_date ? (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {format(new Date(campaign.mail_date), "MMM d, yyyy")}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Not set</span>
              )}
            </TableCell>
            <TableCell>
              <span className="text-sm capitalize">
                {campaign.postage?.replace("_", " ")}
              </span>
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {campaign.status === "draft" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setSelectedCampaign({ id: campaign.id, name: campaign.name })
                    }
                  >
                    <QrCode className="h-4 w-4 mr-1" />
                    Generate QR
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-background z-50">
                    <DropdownMenuItem>View Details</DropdownMenuItem>
                    <DropdownMenuItem>Edit Campaign</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>

    {selectedCampaign && (
      <GenerateQRCodesDialog
        open={!!selectedCampaign}
        onOpenChange={(open) => !open && setSelectedCampaign(null)}
        campaignId={selectedCampaign.id}
        campaignName={selectedCampaign.name}
      />
    )}
    </>
  );
}
