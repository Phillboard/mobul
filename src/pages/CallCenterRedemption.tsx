import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { CallCenterRedemptionPanel } from "@/components/call-center/CallCenterRedemptionPanel";
import { ScriptPanel } from "@/components/call-center/ScriptPanel";
import { UnifiedSidebar } from "@/components/call-center/UnifiedSidebar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function CallCenterRedemption() {
  const [scriptsCollapsed, setScriptsCollapsed] = useState(false);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Call Center Hub</h1>
          <p className="text-muted-foreground">Redeem gift cards and track customer interactions</p>
        </div>

        <div className="flex gap-4">
          {/* Collapsible Scripts Panel */}
          <div className={`transition-all ${scriptsCollapsed ? 'w-14' : 'w-80'}`}>
            <ScriptPanel
              currentStep="code"
              isCollapsed={scriptsCollapsed}
              onToggleCollapse={() => setScriptsCollapsed(!scriptsCollapsed)}
            />
          </div>

          {/* Main Redemption Workflow */}
          <div className="flex-1 min-w-0">
            <CallCenterRedemptionPanel />
          </div>

          {/* Unified Stats & Activity Sidebar */}
          <div className="w-80 flex-shrink-0">
            <UnifiedSidebar selectedPoolId={null} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
