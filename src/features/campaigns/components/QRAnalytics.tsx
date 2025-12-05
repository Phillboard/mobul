import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, Smartphone, MapPin } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface QRAnalyticsProps {
  campaignId: string;
}

export function QRAnalytics({ campaignId }: QRAnalyticsProps) {
  const { data: qrEvents, isLoading } = useQuery({
    queryKey: ['qr-tracking-events', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_tracking_events')
        .select('*, recipient:recipients(*)')
        .eq('campaign_id', campaignId)
        .order('scanned_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['qr-stats', campaignId],
    queryFn: async () => {
      const { data: scans, error } = await supabase
        .from('qr_tracking_events')
        .select('device_type')
        .eq('campaign_id', campaignId);
      
      if (error) throw error;

      const totalScans = scans.length;
      const mobileScans = scans.filter(s => s.device_type === 'mobile').length;
      const desktopScans = scans.filter(s => s.device_type === 'desktop').length;
      const uniqueRecipients = new Set(scans.map((s: any) => s.recipient_id)).size;

      return {
        totalScans,
        mobileScans,
        desktopScans,
        uniqueRecipients,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading QR analytics...</div>
        </CardContent>
      </Card>
    );
  }

  if (!qrEvents || qrEvents.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Analytics
          </CardTitle>
          <CardDescription>Track QR code scans for this campaign</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">No QR code scans yet</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalScans || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unique Recipients</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.uniqueRecipients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Mobile Scans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.mobileScans || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalScans ? Math.round((stats.mobileScans / stats.totalScans) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Desktop Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.desktopScans || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalScans ? Math.round((stats.desktopScans / stats.totalScans) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Recent QR Code Scans
          </CardTitle>
          <CardDescription>Latest QR code scanning activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qrEvents.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">
                        {event.recipient?.first_name} {event.recipient?.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {event.recipient?.city}, {event.recipient?.state}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {event.ip_address || 'Unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {event.device_type || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(event.scanned_at!), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
