/**
 * AgentRecentRedemptions
 *
 * Sidebar component showing recent gift card redemptions performed
 * by the currently logged-in agent. Includes resend capability.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import { ResendSmsButton } from "./ResendSmsButton";
import { Clock, Gift, Phone, User, RefreshCw } from "lucide-react";
import { formatPhoneNumber } from "@/shared/utils/formatPhone";

interface RedemptionEntry {
  id: string;
  recipient_id: string;
  action: string;
  created_at: string;
  metadata: Record<string, any>;
  recipients: {
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    redemption_code: string | null;
    gift_card_assigned_id: string | null;
  } | null;
}

export function AgentRecentRedemptions() {
  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["agent-recent-redemptions"],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];

      const { data, error } = await supabase
        .from("recipient_audit_log")
        .select(`
          id,
          recipient_id,
          action,
          created_at,
          metadata,
          recipients (
            first_name,
            last_name,
            phone,
            redemption_code,
            gift_card_assigned_id
          )
        `)
        .eq("performed_by_user_id", user.user.id)
        .in("action", ["redeemed", "gift_card_assigned", "sms_sent"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("[AgentRecentRedemptions] Query error:", error);
        return [];
      }

      return (data || []) as unknown as RedemptionEntry[];
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-7 w-7">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-4">Loading...</div>
        ) : !entries || entries.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            No recent activity
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const r = entry.recipients;
              const name = [r?.first_name, r?.last_name].filter(Boolean).join(" ") || "Unknown";
              const phone = r?.phone;
              const code = r?.redemption_code;
              const cardValue = entry.metadata?.card_value || entry.metadata?.giftCardValue;
              const giftCardCode = entry.metadata?.card_code || entry.metadata?.giftCardCode;
              const giftCardId = r?.gift_card_assigned_id;

              return (
                <div key={entry.id} className="p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{name}</span>
                      </div>
                      {phone && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-muted-foreground">{formatPhoneNumber(phone)}</span>
                        </div>
                      )}
                      {code && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Gift className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-xs font-mono text-muted-foreground">{code}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">{formatTime(entry.created_at)}</div>
                      {cardValue && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          ${Number(cardValue).toFixed(0)}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Resend button if we have the data */}
                  {giftCardId && giftCardCode && phone && (
                    <div className="mt-2">
                      <ResendSmsButton
                        giftCardId={giftCardId}
                        recipientId={entry.recipient_id}
                        recipientPhone={phone}
                        giftCardCode={giftCardCode}
                        giftCardValue={cardValue ? Number(cardValue) : 0}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
