import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallCenterRedemptionPanel } from "@/components/call-center/CallCenterRedemptionPanel";
import { PoolInventoryWidget } from "@/components/call-center/PoolInventoryWidget";
import { Gift, TrendingUp, Clock } from "lucide-react";

export default function CallCenterDashboard() {

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Call Center Dashboard</h1>
          <p className="text-muted-foreground">Redeem gift cards for customers</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Redemption Panel */}
          <div className="lg:col-span-2">
            <CallCenterRedemptionPanel />
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            {/* Pool Inventory - will populate dynamically when pool selected */}
            <PoolInventoryWidget poolId={null} />
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Today's Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Gift className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-muted-foreground">Cards Provisioned</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">0</div>
                    <div className="text-xs text-muted-foreground">Pending Approvals</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Avg. Time</div>
                    <div className="text-lg font-semibold">--</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>• Ask customer to verify their name and phone</p>
                <p>• Code format: ABC-1234</p>
                <p>• Use "Copy All" to share card details</p>
                <p>• Contact supervisor if pool is empty</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
