import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, Download, TrendingUp, Users, MousePointerClick, FileText, Calendar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import { format, differenceInDays } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Analytics() {
  const { campaignId } = useParams();
  const navigate = useNavigate();

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*, audience:audiences(total_count)')
        .eq('id', campaignId!)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: recipients } = useQuery({
    queryKey: ['campaign-recipients', campaignId],
    queryFn: async () => {
      if (!campaign?.audience_id) return [];
      const { data, error } = await supabase
        .from('recipients')
        .select('*')
        .eq('audience_id', campaign.audience_id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!campaign?.audience_id,
  });

  const { data: events } = useQuery({
    queryKey: ['campaign-events', campaignId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('campaign_id', campaignId!)
        .order('occurred_at', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: !!campaignId,
  });

  if (campaignLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading analytics...</div>
        </div>
      </Layout>
    );
  }

  if (!campaign) {
    return (
      <Layout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Campaign not found</AlertDescription>
        </Alert>
      </Layout>
    );
  }

  // Calculate KPIs
  const totalMailed = campaign.audience?.total_count || 0;
  const deliveredCount = events?.filter(e => e.event_type === 'imb_delivered').length || 0;
  const qrScans = events?.filter(e => e.event_type === 'qr_scanned').length || 0;
  const purlViews = events?.filter(e => e.event_type === 'purl_viewed').length || 0;
  const formSubmissions = events?.filter(e => e.event_type === 'form_submitted').length || 0;

  const deliveryRate = totalMailed > 0 ? ((deliveredCount / totalMailed) * 100).toFixed(1) : '0';
  const qrCTR = deliveredCount > 0 ? ((qrScans / deliveredCount) * 100).toFixed(1) : '0';
  const conversionRate = (qrScans + purlViews) > 0 ? ((formSubmissions / (qrScans + purlViews)) * 100).toFixed(1) : '0';

  // Build timeline chart data
  const mailDate = campaign.mail_date ? new Date(campaign.mail_date) : new Date();
  const timelineData: any[] = [];
  
  if (events && events.length > 0) {
    const eventsByDay = new Map<number, any>();
    
    events.forEach(event => {
      const eventDate = new Date(event.occurred_at!);
      const daysSinceMail = differenceInDays(eventDate, mailDate);
      
      if (!eventsByDay.has(daysSinceMail)) {
        eventsByDay.set(daysSinceMail, {
          day: daysSinceMail,
          delivered: 0,
          scanned: 0,
          forms: 0,
        });
      }
      
      const dayData = eventsByDay.get(daysSinceMail);
      if (event.event_type === 'imb_delivered') dayData.delivered++;
      if (event.event_type === 'qr_scanned') dayData.scanned++;
      if (event.event_type === 'form_submitted') dayData.forms++;
    });
    
    timelineData.push(...Array.from(eventsByDay.values()).sort((a, b) => a.day - b.day));
  }

  // Geographic performance
  const geoData = recipients?.reduce((acc: any, recipient) => {
    const state = recipient.state;
    if (!acc[state]) {
      acc[state] = { state, scans: 0, forms: 0, recipients: 0 };
    }
    acc[state].recipients++;
    
    const recipientScans = events?.filter(e => 
      e.recipient_id === recipient.id && e.event_type === 'qr_scanned'
    ).length || 0;
    const recipientForms = events?.filter(e => 
      e.recipient_id === recipient.id && e.event_type === 'form_submitted'
    ).length || 0;
    
    acc[state].scans += recipientScans;
    acc[state].forms += recipientForms;
    return acc;
  }, {});

  const geoChartData = geoData ? Object.values(geoData).sort((a: any, b: any) => b.scans - a.scans).slice(0, 10) : [];

  // Recipient detail data
  const recipientDetails = recipients?.map(recipient => {
    const deliveredEvent = events?.find(e => e.recipient_id === recipient.id && e.event_type === 'imb_delivered');
    const scannedEvent = events?.find(e => e.recipient_id === recipient.id && e.event_type === 'qr_scanned');
    const formEvent = events?.find(e => e.recipient_id === recipient.id && e.event_type === 'form_submitted');
    const lastEvent = events?.filter(e => e.recipient_id === recipient.id).sort((a, b) => 
      new Date(b.occurred_at!).getTime() - new Date(a.occurred_at!).getTime()
    )[0];

    return {
      id: recipient.id,
      name: `${recipient.first_name} ${recipient.last_name}`,
      address: `${recipient.city}, ${recipient.state}`,
      deliveredDate: deliveredEvent?.occurred_at,
      scanned: !!scannedEvent,
      formSubmitted: !!formEvent,
      lastEvent: lastEvent?.event_type,
      lastEventDate: lastEvent?.occurred_at,
    };
  }) || [];

  const exportToCsv = () => {
    const csv = [
      ['Name', 'Address', 'Delivered Date', 'QR Scanned', 'Form Submitted', 'Last Event', 'Last Event Date'],
      ...recipientDetails.map(r => [
        r.name,
        r.address,
        r.deliveredDate ? format(new Date(r.deliveredDate), 'yyyy-MM-dd HH:mm') : '',
        r.scanned ? 'Yes' : 'No',
        r.formSubmitted ? 'Yes' : 'No',
        r.lastEvent || '',
        r.lastEventDate ? format(new Date(r.lastEventDate), 'yyyy-MM-dd HH:mm') : '',
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-${campaignId}-analytics.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Campaign Analytics</h1>
            <p className="text-muted-foreground">{campaign.name}</p>
          </div>
          <Button onClick={exportToCsv} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mailed</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalMailed.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{deliveredCount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{deliveryRate}% delivery rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QR Scans</CardTitle>
              <MousePointerClick className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{qrScans.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{qrCTR}% CTR</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">PURL Views</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purlViews.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Form Submissions</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formSubmissions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{conversionRate}% conversion</p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Chart */}
        {timelineData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Delivery Timeline</CardTitle>
              <CardDescription>Days since mail date</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" label={{ value: 'Days Since Mailing', position: 'insideBottom', offset: -5 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="delivered" stroke="#10b981" name="Delivered" />
                  <Line type="monotone" dataKey="scanned" stroke="#3b82f6" name="QR Scans" />
                  <Line type="monotone" dataKey="forms" stroke="#8b5cf6" name="Forms" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Geographic Performance */}
        {geoChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Geographic Performance</CardTitle>
              <CardDescription>Top 10 states by QR scans</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={geoChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="state" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="scans" fill="#3b82f6" name="QR Scans" />
                  <Bar dataKey="forms" fill="#8b5cf6" name="Forms" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recipient Detail Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recipient Details</CardTitle>
            <CardDescription>Individual recipient performance</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>QR Scanned</TableHead>
                  <TableHead>Form Submitted</TableHead>
                  <TableHead>Last Event</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipientDetails.slice(0, 50).map(recipient => (
                  <TableRow key={recipient.id}>
                    <TableCell className="font-medium">{recipient.name}</TableCell>
                    <TableCell>{recipient.address}</TableCell>
                    <TableCell>
                      {recipient.deliveredDate ? format(new Date(recipient.deliveredDate), 'MM/dd/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={recipient.scanned ? 'default' : 'secondary'}>
                        {recipient.scanned ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={recipient.formSubmitted ? 'default' : 'secondary'}>
                        {recipient.formSubmitted ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {recipient.lastEvent ? (
                        <div>
                          <div className="capitalize">{recipient.lastEvent.replace(/_/g, ' ')}</div>
                          <div className="text-xs text-muted-foreground">
                            {recipient.lastEventDate && format(new Date(recipient.lastEventDate), 'MM/dd HH:mm')}
                          </div>
                        </div>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {recipientDetails.length > 50 && (
              <div className="text-sm text-muted-foreground text-center mt-4">
                Showing first 50 of {recipientDetails.length} recipients. Export CSV for full data.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
