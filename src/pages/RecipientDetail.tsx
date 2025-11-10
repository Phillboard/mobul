import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, MapPin, Mail, Phone, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function RecipientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: recipient, isLoading } = useQuery({
    queryKey: ['recipient', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipients')
        .select('*, audience:audiences(*)')
        .eq('id', id!)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: events } = useQuery({
    queryKey: ['recipient-events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('recipient_id', id!)
        .order('occurred_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading recipient...</div>
        </div>
      </Layout>
    );
  }

  if (!recipient) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Recipient not found</AlertDescription>
        </Alert>
      </Layout>
    );
  }

  const getEventIcon = (eventType: string) => {
    const icons: Record<string, string> = {
      imb_injected: "📦",
      imb_in_transit: "🚚",
      imb_out_for_delivery: "📫",
      imb_delivered: "✅",
      mail_returned: "↩️",
      qr_scanned: "📱",
      purl_viewed: "👁️",
      call_clicked: "📞",
      email_clicked: "📧",
      form_submitted: "📝",
    };
    return icons[eventType] || "•";
  };

  const getEventColor = (eventType: string) => {
    if (eventType === 'mail_returned') return 'bg-red-500';
    if (eventType === 'form_submitted') return 'bg-green-500';
    if (eventType.includes('delivered')) return 'bg-green-500';
    if (eventType.includes('qr') || eventType.includes('purl')) return 'bg-blue-500';
    return 'bg-slate-500';
  };

  // Calculate time between delivery and first engagement
  const deliveryEvent = events?.find(e => e.event_type === 'imb_delivered');
  const firstEngagementEvent = events?.find(e => 
    ['qr_scanned', 'purl_viewed'].includes(e.event_type)
  );
  
  let engagementVelocity = null;
  if (deliveryEvent && firstEngagementEvent) {
    const deliveryTime = new Date(deliveryEvent.occurred_at!).getTime();
    const engagementTime = new Date(firstEngagementEvent.occurred_at!).getTime();
    const hoursDiff = Math.round((engagementTime - deliveryTime) / (1000 * 60 * 60));
    engagementVelocity = hoursDiff;
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">
              {recipient.first_name} {recipient.last_name}
            </h1>
            <p className="text-muted-foreground">Recipient Details & Tracking</p>
          </div>
          <Badge className={recipient.delivery_status === 'delivered' ? 'bg-green-500' : 'bg-slate-500'}>
            {recipient.delivery_status || 'Unknown'}
          </Badge>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recipient.company && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Company:</span>
                  <span className="font-medium">{recipient.company}</span>
                </div>
              )}
              {recipient.email && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Email:</span>
                  <a href={`mailto:${recipient.email}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {recipient.email}
                  </a>
                </div>
              )}
              {recipient.phone && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Phone:</span>
                  <a href={`tel:${recipient.phone}`} className="font-medium text-primary hover:underline flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {recipient.phone}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Mailing Address
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>{recipient.address1}</div>
              {recipient.address2 && <div>{recipient.address2}</div>}
              <div>
                {recipient.city}, {recipient.state} {recipient.zip}
                {recipient.zip4 && `-${recipient.zip4}`}
              </div>
              <div className="pt-2 border-t">
                <Badge variant="outline">
                  {recipient.validation_status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {engagementVelocity !== null && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Engagement Velocity:</strong> Responded {engagementVelocity} hours after delivery
              {engagementVelocity < 24 && " (Fast responder!)"}
            </AlertDescription>
          </Alert>
        )}

        {events && events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
              <CardDescription>Complete tracking history for this recipient</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-4">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                
                {events.map((event, index) => (
                  <div key={event.id} className="relative flex gap-4 items-start">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full ${getEventColor(event.event_type)} flex items-center justify-center text-white font-bold z-10`}>
                      {getEventIcon(event.event_type)}
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium capitalize">
                            {event.event_type.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(event.occurred_at!), { addSuffix: true })}
                          </div>
                          {event.event_data_json && typeof event.event_data_json === 'object' && (
                            <div className="text-xs text-muted-foreground mt-1">
                              {(event.event_data_json as any).is_qr_scan && (
                                <Badge variant="outline" className="mr-2">QR Scan</Badge>
                              )}
                              {(event.event_data_json as any).is_mobile && (
                                <Badge variant="outline" className="mr-2">Mobile</Badge>
                              )}
                              {(event.event_data_json as any).reason && (
                                <span className="text-red-500">
                                  Reason: {(event.event_data_json as any).reason}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {event.source}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
