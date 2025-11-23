import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CallCenterRedemptionPanel } from "@/components/call-center/CallCenterRedemptionPanel";
import { AgentActivityFeed } from "@/components/call-center/AgentActivityFeed";

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
            <AgentActivityFeed />

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
