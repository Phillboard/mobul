import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MoreVertical, Calendar, Users, Phone, Gift, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CampaignCardProps {
  campaign: any;
  onViewDetails: () => void;
  onViewAnalytics: () => void;
  onReviewProof: () => void;
  onSubmitToVendor: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  getStatusColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
}

export function CampaignCard({
  campaign,
  onViewDetails,
  onViewAnalytics,
  onReviewProof,
  onSubmitToVendor,
  onEdit,
  onDuplicate,
  onDelete,
  getStatusColor,
  getStatusLabel,
}: CampaignCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onViewDetails}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{campaign.name}</h3>
            <Badge className={`${getStatusColor(campaign.status)} mt-1`}>
              {getStatusLabel(campaign.status)}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewAnalytics(); }}>
                Analytics
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReviewProof(); }}>
                Review Proof
              </DropdownMenuItem>
              {campaign.status === 'draft' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSubmitToVendor(); }}>
                    Submit to Vendor
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
                Duplicate
              </DropdownMenuItem>
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
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">
              {campaign.mail_date ? format(new Date(campaign.mail_date), 'MMM d, yyyy') : 'No date set'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>{campaign.audiences?.valid_count || 0} recipients</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 shrink-0" />
            <span>{campaign.callsCount || 0} calls</span>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 shrink-0" />
            <span>{campaign.rewardsCount || 0} rewards</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span>{campaign.conversionRate?.toFixed(1) || 0}% conversion</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
