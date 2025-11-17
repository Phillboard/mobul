import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreVertical, DollarSign, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pipeline, PipelineStage } from "@/hooks/usePipelines";
import { Deal, useUpdateDeal } from "@/hooks/useDeals";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface DealKanbanProps {
  pipeline: Pipeline;
  deals: Deal[];
  isLoading?: boolean;
}

export function DealKanban({ pipeline, deals, isLoading }: DealKanbanProps) {
  const updateDeal = useUpdateDeal();
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);

  const stages = pipeline.stages as PipelineStage[];

  const handleDragStart = (deal: Deal) => {
    setDraggedDeal(deal);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (stage: PipelineStage) => {
    if (!draggedDeal) return;

    const stageIndex = stages.findIndex(s => s.id === stage.id);

    await updateDeal.mutateAsync({
      id: draggedDeal.id,
      stage_id: stage.id,
      stage_order: stageIndex,
      probability: stage.probability,
    });

    setDraggedDeal(null);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-80">
            <Skeleton className="h-[600px]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4">
        {stages.map((stage) => {
          const stageDeals = deals.filter((deal) => deal.stage_id === stage.id);
          const stageValue = stageDeals.reduce((sum, deal) => sum + (deal.amount || 0), 0);

          return (
            <div
              key={stage.id}
              className="flex-shrink-0 w-80"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(stage)}
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {stage.name}
                      <Badge variant="secondary" className="ml-2">
                        {stageDeals.length}
                      </Badge>
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {stage.probability}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    ${stageValue.toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {stageDeals.map((deal) => (
                      <DealCard
                        key={deal.id}
                        deal={deal}
                        onDragStart={handleDragStart}
                      />
                    ))}
                    {stageDeals.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No deals in this stage
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

interface DealCardProps {
  deal: Deal;
  onDragStart: (deal: Deal) => void;
}

function DealCard({ deal, onDragStart }: DealCardProps) {
  return (
    <Card
      draggable
      onDragStart={() => onDragStart(deal)}
      className={cn(
        "cursor-move hover:shadow-md transition-shadow",
        "border-l-4",
        deal.status === "won" && "border-l-green-500",
        deal.status === "lost" && "border-l-red-500",
        deal.status === "open" && "border-l-primary"
      )}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <h4 className="font-medium text-sm line-clamp-2">{deal.deal_name}</h4>
          <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {deal.amount && (
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">
              {deal.amount.toLocaleString()} {deal.currency}
            </span>
          </div>
        )}

        {deal.contacts && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <User className="h-3 w-3" />
            <span>
              {deal.contacts.first_name} {deal.contacts.last_name}
            </span>
          </div>
        )}

        {deal.expected_close_date && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{new Date(deal.expected_close_date).toLocaleDateString()}</span>
          </div>
        )}

        {deal.profiles && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Owner: {deal.profiles.full_name}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
