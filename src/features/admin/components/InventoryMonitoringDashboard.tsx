import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, AlertCircle, CheckCircle, RefreshCw, Package } from "lucide-react";
import { useToast } from '@shared/hooks';

interface InventoryHealthItem {
  pool_id: string;
  client_name: string;
  brand_name: string;
  card_value: number;
  pool_name: string;
  available_cards: number;
  total_cards: number;
  availability_percentage: number;
  health_status: 'empty' | 'critical' | 'low' | 'medium' | 'healthy';
}

export function InventoryMonitoringDashboard() {
  const { toast } = useToast();

  const { data: inventoryHealth, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['inventory-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_inventory_health')
        .select('*');
      
      if (error) throw error;
      return data as InventoryHealthItem[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const { data: lowInventorySummary } = useQuery({
    queryKey: ['low-inventory-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_low_inventory_summary');
      
      if (error) throw error;
      return data;
    },
  });

  const runInventoryCheck = async () => {
    try {
      const { error } = await supabase.rpc('check_inventory_levels');
      
      if (error) throw error;
      
      toast({
        title: "Inventory Check Complete",
        description: "Low inventory alerts have been updated",
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Check Failed",
        description: error instanceof Error ? error.message : "Failed to check inventory",
        variant: "destructive",
      });
    }
  };

  const criticalPools = inventoryHealth?.filter(p => p.health_status === 'empty' || p.health_status === 'critical') || [];
  const lowPools = inventoryHealth?.filter(p => p.health_status === 'low') || [];
  const healthyPools = inventoryHealth?.filter(p => p.health_status === 'healthy' || p.health_status === 'medium') || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'empty':
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'low':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case 'medium':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      empty: 'destructive' as const,
      critical: 'destructive' as const,
      low: 'outline' as const,
      medium: 'secondary' as const,
      healthy: 'default' as const,
    };
    
    return <Badge variant={variants[status as keyof typeof variants]}>{status.toUpperCase()}</Badge>;
  };

  if (isLoading) {
    return <div>Loading inventory monitoring...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Inventory Monitoring</h2>
          <p className="text-muted-foreground">Real-time gift card inventory health tracking</p>
        </div>
        <Button onClick={runInventoryCheck} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Checking...' : 'Run Check'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pools</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryHealth?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalPools.length}</div>
            <p className="text-xs text-muted-foreground">Needs immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{lowPools.length}</div>
            <p className="text-xs text-muted-foreground">Below 20% capacity</p>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{healthyPools.length}</div>
            <p className="text-xs text-muted-foreground">Above 20% capacity</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts */}
      {criticalPools.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{criticalPools.length} pool(s)</strong> have critical inventory levels and require immediate replenishment!
          </AlertDescription>
        </Alert>
      )}

      {/* Critical Pools */}
      {criticalPools.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Critical Inventory
            </CardTitle>
            <CardDescription>Pools with less than 10 cards or empty</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {criticalPools.map((pool) => (
                <div key={pool.pool_id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(pool.health_status)}
                    <div>
                      <div className="font-medium">{pool.brand_name} ${pool.card_value}</div>
                      <div className="text-sm text-muted-foreground">{pool.client_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-red-600">
                      {pool.available_cards} / {pool.total_cards} cards
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pool.availability_percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Low Stock Pools */}
      {lowPools.length > 0 && (
        <Card className="border-yellow-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Low Stock
            </CardTitle>
            <CardDescription>Pools below 20% capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowPools.map((pool) => (
                <div key={pool.pool_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(pool.health_status)}
                    <div>
                      <div className="font-medium">{pool.brand_name} ${pool.card_value}</div>
                      <div className="text-sm text-muted-foreground">{pool.client_name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-600">
                      {pool.available_cards} / {pool.total_cards} cards
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {pool.availability_percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Pools Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Inventory Pools</CardTitle>
          <CardDescription>Complete inventory health overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {inventoryHealth?.map((pool) => (
              <div key={pool.pool_id} className="flex items-center justify-between p-2 border rounded hover:bg-accent transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  {getStatusIcon(pool.health_status)}
                  <div className="flex-1">
                    <div className="font-medium">{pool.brand_name} ${pool.card_value}</div>
                    <div className="text-sm text-muted-foreground">{pool.client_name} • {pool.pool_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="font-medium">{pool.available_cards} / {pool.total_cards}</div>
                    <div className="text-xs text-muted-foreground">{pool.availability_percentage.toFixed(1)}%</div>
                  </div>
                  {getStatusBadge(pool.health_status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

