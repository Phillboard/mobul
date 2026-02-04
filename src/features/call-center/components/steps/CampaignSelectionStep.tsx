/**
 * Campaign Selection Step Component
 * 
 * Shown when a redemption code exists in multiple campaigns.
 * Allows the agent to select the correct campaign to proceed with.
 * Also handles previously redeemed codes - offering to resend existing gift cards.
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Separator } from '@/shared/components/ui/separator';
import { 
  Megaphone, 
  Calendar, 
  User, 
  Building2, 
  CheckCircle,
  Clock,
  RotateCcw,
  Info,
  Gift,
  Send,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface CampaignData {
  id: string;
  name: string;
  status?: string;
  mail_date?: string;
  created_at?: string;
  clients?: { id: string; name: string };
}

// Existing gift card assignment for previously redeemed recipients
interface ExistingCard {
  id: string;
  giftCardId: string;
  conditionId: string;
  conditionName: string;
  conditionNumber: number;
  cardCode: string;
  cardNumber?: string;
  cardValue: number;
  brandName: string;
  brandLogo?: string;
  assignedAt: string;
  deliveredAt?: string;
  deliveryStatus: string;
  // Campaign info for the gift card (may differ from recipient's current campaign)
  campaignId?: string;
  campaignName?: string;
  campaignStatus?: string;
  clientName?: string;
}

interface RecipientData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  redemption_code: string;
  campaign?: CampaignData;
  existingCards?: ExistingCard[];
}

interface CampaignSelectionStepProps {
  recipients: RecipientData[];
  redemptionCode: string;
  onSelect: (recipient: RecipientData) => void;
  onCancel: () => void;
  onResend?: (recipient: RecipientData, card: ExistingCard) => void;
  currentClientId?: string;
  currentClientName?: string;
}

// Map campaign status to display info
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  'in_production': { label: 'In Production', variant: 'default' },
  'mailed': { label: 'Mailed', variant: 'default' },
  'scheduled': { label: 'Scheduled', variant: 'secondary' },
  'draft': { label: 'Draft', variant: 'outline' },
  'proofed': { label: 'Proofed', variant: 'outline' },
  'completed': { label: 'Completed', variant: 'secondary' },
};

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

export function CampaignSelectionStep({
  recipients,
  redemptionCode,
  onSelect,
  onCancel,
  onResend,
  currentClientId,
  currentClientName,
}: CampaignSelectionStepProps) {
  const [expandedRecipient, setExpandedRecipient] = useState<string | null>(null);
  
  // Check if any recipient has existing cards (previously redeemed)
  const hasAnyRedeemed = recipients.some(r => r.existingCards && r.existingCards.length > 0);
  
  // Check if any recipient is from a different client
  const hasDifferentClients = currentClientId && recipients.some(r => {
    const recipientClientId = (r.campaign as any)?.client_id;
    return recipientClientId && recipientClientId !== currentClientId;
  });
  
  return (
    <Card className="border-2 border-yellow-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-yellow-600" />
          Select Campaign
        </CardTitle>
        <CardDescription>
          Code <span className="font-mono font-bold">{redemptionCode}</span> exists in {recipients.length > 1 ? 'multiple campaigns' : '1 campaign'}.
          {hasAnyRedeemed && ' Some have already been redeemed.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            {hasAnyRedeemed 
              ? 'This code has been previously redeemed for some campaigns. You can resend the gift card or proceed with a new condition.'
              : 'Ask the customer which campaign or mailing they are calling about to select the correct one.'
            }
          </AlertDescription>
        </Alert>

        {hasDifferentClients && (
          <Alert className="border-amber-300 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Note:</strong> Some campaigns below belong to different clients. 
              {currentClientName && <> Your currently selected client is <strong>{currentClientName}</strong>.</>}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {recipients.map((recipient) => {
            const campaign = recipient.campaign;
            const statusConfig = STATUS_CONFIG[campaign?.status || ''] || { label: campaign?.status || 'Unknown', variant: 'outline' as const };
            const hasExistingCards = recipient.existingCards && recipient.existingCards.length > 0;
            const isExpanded = expandedRecipient === recipient.id;
            const isDifferentClient = currentClientId && (campaign as any)?.client_id && (campaign as any).client_id !== currentClientId;
            
            return (
              <div
                key={recipient.id}
                className={`border rounded-lg overflow-hidden ${
                  hasExistingCards 
                    ? 'border-amber-400 bg-amber-50/50' 
                    : 'border-border'
                }`}
              >
                {/* Main campaign button */}
                <Button
                  variant="ghost"
                  className={`w-full h-auto py-4 px-4 justify-start hover:bg-primary/5 rounded-none ${
                    hasExistingCards ? 'hover:bg-amber-100' : ''
                  }`}
                  onClick={() => {
                    if (hasExistingCards) {
                      // Toggle expansion to show existing cards
                      setExpandedRecipient(isExpanded ? null : recipient.id);
                    } else {
                      // No existing cards, proceed directly
                      onSelect(recipient);
                    }
                  }}
                >
                  <div className="flex flex-col items-start gap-2 w-full">
                    {/* Campaign name and status badges */}
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="font-semibold text-base">
                        {campaign?.name || 'Unknown Campaign'}
                      </span>
                      <div className="flex items-center gap-2">
                        {isDifferentClient && (
                          <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Different Client
                          </Badge>
                        )}
                        {hasExistingCards && (
                          <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Previously Redeemed
                          </Badge>
                        )}
                        <Badge variant={statusConfig.variant}>
                          {statusConfig.label}
                        </Badge>
                        {hasExistingCards && (
                          isExpanded 
                            ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    
                    {/* Details row */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {/* Client */}
                      {campaign?.clients?.name && (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>{campaign.clients.name}</span>
                        </div>
                      )}
                      
                      {/* Recipient name */}
                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        <span>
                          {recipient.first_name || recipient.last_name 
                            ? `${recipient.first_name || ''} ${recipient.last_name || ''}`.trim()
                            : 'No name'}
                        </span>
                      </div>
                      
                      {/* Mail date or created date */}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                          {campaign?.mail_date 
                            ? `Mailed: ${formatDate(campaign.mail_date)}`
                            : `Created: ${formatDate(campaign?.created_at)}`
                          }
                        </span>
                      </div>
                      
                      {/* Existing cards count */}
                      {hasExistingCards && (
                        <div className="flex items-center gap-1 text-amber-700">
                          <Gift className="h-3.5 w-3.5" />
                          <span>{recipient.existingCards!.length} gift card(s) issued</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Button>
                
                {/* Expanded section showing existing cards */}
                {hasExistingCards && isExpanded && (
                  <div className="border-t border-amber-300 bg-amber-50 p-4 space-y-4">
                    <div className="text-sm font-medium text-amber-800">
                      Previously Issued Gift Cards
                    </div>
                    
                    {recipient.existingCards!.map((card) => (
                      <div 
                        key={card.id}
                        className="bg-white rounded-lg p-4 border border-amber-200 space-y-3"
                      >
                        {/* Card info header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {card.brandLogo ? (
                              <img 
                                src={card.brandLogo} 
                                alt={card.brandName} 
                                className="h-8 w-auto object-contain"
                              />
                            ) : (
                              <Gift className="h-8 w-8 text-amber-600" />
                            )}
                            <div>
                              <div className="font-semibold">{card.brandName}</div>
                              <div className="text-sm text-muted-foreground">
                                Condition {card.conditionNumber}: {card.conditionName}
                              </div>
                              {/* Show campaign info if gift card is from a different campaign */}
                              {card.campaignName && card.campaignId !== campaign?.id && (
                                <div className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
                                  <Building2 className="h-3 w-3" />
                                  <span>From: {card.campaignName}</span>
                                  {card.clientName && <span className="text-muted-foreground">({card.clientName})</span>}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-2xl font-bold text-green-600">
                            ${card.cardValue.toFixed(2)}
                          </div>
                        </div>
                        
                        {/* Card details */}
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Card Code: </span>
                            <span className="font-mono font-medium">{card.cardCode}</span>
                          </div>
                          {card.cardNumber && (
                            <div>
                              <span className="text-muted-foreground">Card Number: </span>
                              <span className="font-mono font-medium">{card.cardNumber}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Issued: </span>
                            <span>{formatDate(card.assignedAt)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Status: </span>
                            <Badge 
                              variant={card.deliveryStatus === 'delivered' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {card.deliveryStatus || 'Issued'}
                            </Badge>
                          </div>
                        </div>
                        
                        {/* Resend button */}
                        {onResend && (
                          <Button
                            onClick={() => onResend(recipient, card)}
                            className="w-full bg-amber-600 hover:bg-amber-700"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Resend This Gift Card
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <Separator className="bg-amber-200" />
                    
                    {/* Option to proceed with new redemption */}
                    <Button
                      variant="outline"
                      onClick={() => onSelect(recipient)}
                      className="w-full border-amber-400 hover:bg-amber-100"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Redeem Another Condition
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onCancel}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Different Code
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
