import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Download, Search, Loader2, MapPin, CheckCircle } from "lucide-react";
import { useAudience, useRecipients, useAudienceStats } from "@/hooks/useAudiences";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function AudienceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [validationFilter, setValidationFilter] = useState<'valid' | 'invalid' | 'suppressed' | ''>("");
  const [isExporting, setIsExporting] = useState(false);
  
  const { data: audience, isLoading: audienceLoading } = useAudience(id);
  const { data: recipientsData, isLoading: recipientsLoading } = useRecipients(
    id,
    page,
    50,
    search,
    validationFilter
  );
  const { data: stats } = useAudienceStats(id);

  const pageSize = 50;
  const totalPages = recipientsData ? Math.ceil(recipientsData.count / pageSize) : 0;

  const handleExport = async () => {
    if (!id) return;
    
    setIsExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { data, error } = await supabase.functions.invoke('export-audience', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        // Pass audience_id as query parameter
      });

      if (error) throw error;

      // Download the CSV
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-audience?audience_id=${id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audience-${id}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: "Your audience has been exported to CSV",
      });
    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (audienceLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!audience) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold">Audience not found</h2>
          <Button onClick={() => navigate('/audiences')} className="mt-4">
            Back to Audiences
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/audiences')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{audience.name}</h1>
              <p className="text-muted-foreground mt-1">
                Created {format(new Date(audience.created_at), 'MMMM d, yyyy')}
              </p>
            </div>
          </div>
          <Button onClick={handleExport} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Recipients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{audience.total_count.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Valid Addresses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{audience.valid_count.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Invalid</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{audience.invalid_count.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Source</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary" className="text-sm">{audience.source}</Badge>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Distribution & Validation Breakdown */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Geographic Distribution
              </CardTitle>
              <CardDescription>Top states by recipient count</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.geographic && stats.geographic.length > 0 ? (
                <div className="space-y-2">
                  {stats.geographic.slice(0, 10).map(({ state, count }) => (
                    <div key={state} className="flex items-center justify-between">
                      <span className="font-medium">{state}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(count / stats.geographic[0].count) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-muted-foreground w-16 text-right">
                          {count.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No geographic data available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Validation Breakdown
              </CardTitle>
              <CardDescription>Recipients by validation status</CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.validation ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-success/20 bg-success/5">
                    <span className="font-medium">Valid</span>
                    <Badge variant="outline" className="text-success border-success">
                      {(stats.validation.valid || 0).toLocaleString()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                    <span className="font-medium">Invalid</span>
                    <Badge variant="outline" className="text-destructive border-destructive">
                      {(stats.validation.invalid || 0).toLocaleString()}
                    </Badge>
                  </div>
                  {stats.validation.suppressed > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="font-medium">Suppressed</span>
                      <Badge variant="outline">
                        {(stats.validation.suppressed || 0).toLocaleString()}
                      </Badge>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No validation data available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recipients Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recipients</CardTitle>
                <CardDescription>
                  {recipientsData?.count.toLocaleString()} total recipients
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, address, city..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 w-64"
                  />
                </div>
                <Select 
                  value={validationFilter} 
                  onValueChange={(value) => setValidationFilter(value as 'valid' | 'invalid' | 'suppressed' | '')}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="valid">Valid</SelectItem>
                    <SelectItem value="invalid">Invalid</SelectItem>
                    <SelectItem value="suppressed">Suppressed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {recipientsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : recipientsData && recipientsData.data.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>ZIP</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recipientsData.data.map((recipient) => (
                      <TableRow key={recipient.id}>
                        <TableCell className="font-medium">
                          {[recipient.first_name, recipient.last_name].filter(Boolean).join(' ') || '-'}
                        </TableCell>
                        <TableCell>{recipient.address1}</TableCell>
                        <TableCell>{recipient.city}</TableCell>
                        <TableCell>{recipient.state}</TableCell>
                        <TableCell>{recipient.zip}</TableCell>
                        <TableCell className="text-muted-foreground">{recipient.email || '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              recipient.validation_status === 'valid'
                                ? 'default'
                                : recipient.validation_status === 'invalid'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {recipient.validation_status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, recipientsData.count)} of {recipientsData.count.toLocaleString()} recipients
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recipients found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
