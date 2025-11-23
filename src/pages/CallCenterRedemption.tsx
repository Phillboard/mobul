import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CallCenterRedemptionPanel } from "@/components/call-center/CallCenterRedemptionPanel";
import { Gift, TrendingUp, Clock } from "lucide-react";

export default function CallCenterRedemption() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Redeem Gift Cards</h1>
          <p className="text-muted-foreground">Provision gift cards for customers via redemption codes</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Redemption Panel */}
          <div className="lg:col-span-2">
            <CallCenterRedemptionPanel />
          </div>

          {/* Stats Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Today's Activity</CardTitle>
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
                    <div className="text-xs text-muted-foreground">Successful Redemptions</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Avg. Time</div>
                    <div className="text-lg font-semibold">-- sec</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Reference</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <div>
                  <div className="font-medium text-foreground mb-1">Before Redeeming:</div>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Ask customer to verify their name</li>
                    <li>Confirm phone number or email</li>
                    <li>Get the redemption code</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">Code Format:</div>
                  <p>ABC-1234 (letters-numbers)</p>
                </div>
                <div>
                  <div className="font-medium text-foreground mb-1">After Provisioning:</div>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Read card details to customer</li>
                    <li>Use "Copy All" for easy sharing</li>
                    <li>Remind about expiration date</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-yellow-900 dark:text-yellow-100">
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-yellow-800 dark:text-yellow-200 space-y-2">
                <p><strong>Pool Empty:</strong> Contact supervisor</p>
                <p><strong>Invalid Code:</strong> Ask customer to re-check</p>
                <p><strong>Pending Approval:</strong> Transfer to manager</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
