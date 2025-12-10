import { Card } from "@/shared/components/ui/card";
import { PoolInventoryWidget } from "./PoolInventoryWidget";
import { AgentAuthorizationLog } from "./AgentAuthorizationLog";
import { CallCenterMetrics } from "./CallCenterMetrics";

interface UnifiedSidebarProps {
  selectedPoolId: string | null;
}

export function UnifiedSidebar({ selectedPoolId }: UnifiedSidebarProps) {
  return (
    <div className="space-y-4">
      {/* Pool Inventory */}
      {selectedPoolId && (
        <PoolInventoryWidget poolId={selectedPoolId} />
      )}

      {/* Call Center Metrics */}
      <CallCenterMetrics />

      {/* Agent Authorization Log */}
      <AgentAuthorizationLog />

      {/* Quick Tips */}
      <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
          📋 Quick Tips
        </h4>
        <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <div>• Always verify customer name</div>
          <div>• Code format: ABC-1234</div>
          <div>• Use "Enrich Data" to update info</div>
          <div>• Check scripts panel for guidance</div>
        </div>
      </Card>
    </div>
  );
}
