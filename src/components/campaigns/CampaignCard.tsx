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
      variant="glass"
      hover="lift"
      className="cursor-pointer group relative overflow-hidden transition-all duration-300"
      onClick={onViewDetails}
    >
      {/* Animated gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardContent className="p-4 relative z-10">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate group-hover:text-primary transition-colors duration-200">{campaign.name}</h3>
            <Badge className={`${getStatusColor(campaign.status)} mt-1`}>
              {getStatusLabel(campaign.status)}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 rounded-[--radius] hover:bg-primary/10 hover:text-primary transition-all duration-200">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card/95 backdrop-blur-xl border-border/50">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewAnalytics(); }}>
                Analytics
              </DropdownMenuItem>
              {/* Review Proof and Submit to Vendor - only for ACE fulfillment campaigns */}
              {campaign.mailing_method === 'ace_fulfillment' && (
                <>
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
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)-4px)] bg-primary/10">
              <Calendar className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <span className="truncate">
              {campaign.mail_date ? format(new Date(campaign.mail_date), 'MMM d, yyyy') : 'No date set'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)-4px)] bg-accent/10">
              <Users className="h-4 w-4 shrink-0 text-accent" />
            </div>
            <span>
              {campaign.contact_lists?.name || campaign.audiences?.name || 'No list'} 
              {' '}
              ({campaign.contact_lists?.contact_count || campaign.audiences?.valid_count || 0} contacts)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)-4px)] bg-success/10">
              <Phone className="h-4 w-4 shrink-0 text-success" />
            </div>
            <span>{campaign.callsCount || 0} calls</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)-4px)] bg-warning/10">
              <Gift className="h-4 w-4 shrink-0 text-warning" />
            </div>
            <span>{campaign.rewardsCount || 0} rewards</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[calc(var(--radius)-4px)] bg-primary/10">
              <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <span>{campaign.conversionRate?.toFixed(1) || 0}% conversion</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
