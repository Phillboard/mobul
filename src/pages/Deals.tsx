import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, LayoutGrid, List, TrendingUp } from "lucide-react";
import { useTenant } from "@/contexts/TenantContext";
import { useDeals, usePipelineMetrics } from "@/hooks/useDeals";
import { usePipelines, useDefaultPipeline } from "@/hooks/usePipelines";
import { DealKanban } from "@/components/deals/DealKanban";
import { DealForm } from "@/components/deals/DealForm";

export default function Deals() {
  const { currentClient } = useTenant();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>();
  
  const { data: pipelines } = usePipelines(currentClient?.id || null);
  const defaultPipeline = useDefaultPipeline(currentClient?.id || null);
  
  const activePipeline = selectedPipelineId 
    ? pipelines?.find(p => p.id === selectedPipelineId) 
    : defaultPipeline;

  const { data: deals, isLoading } = useDeals(currentClient?.id || null, {
    pipeline_id: activePipeline?.id,
    status: 'open',
  });

  const { data: metrics } = usePipelineMetrics(
    currentClient?.id || null, 
    activePipeline?.id
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Deals</h1>
            <p className="text-muted-foreground mt-2">
              Manage your sales pipeline and track opportunities
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Deals</p>
                  <p className="text-2xl font-bold">{metrics?.total_deals || 0}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pipeline Value</p>
                <p className="text-2xl font-bold">
                  ${Number(metrics?.total_value || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Weighted Value</p>
                <p className="text-2xl font-bold">
                  ${Number(metrics?.weighted_value || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Deal Size</p>
                <p className="text-2xl font-bold">
                  ${Number(metrics?.avg_deal_size || 0).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
                <p className="text-2xl font-bold">
                  {Number(metrics?.win_rate || 0).toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline Tabs */}
        {pipelines && pipelines.length > 1 && (
          <Tabs value={activePipeline?.id} onValueChange={setSelectedPipelineId}>
            <TabsList>
              {pipelines.map((pipeline) => (
                <TabsTrigger key={pipeline.id} value={pipeline.id}>
                  {pipeline.pipeline_name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {/* Views */}
        <Tabs defaultValue="kanban">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="kanban">
                <LayoutGrid className="h-4 w-4 mr-2" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="table">
                <List className="h-4 w-4 mr-2" />
                Table
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="kanban" className="mt-6">
            {activePipeline ? (
              <DealKanban 
                pipeline={activePipeline} 
                deals={deals || []} 
                isLoading={isLoading}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center">
                  <p className="text-muted-foreground">
                    No pipeline found. Create a pipeline to get started.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-6">
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Table view coming soon</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <DealForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        clientId={currentClient?.id || ""}
        pipelineId={activePipeline?.id}
      />
    </Layout>
  );
}
