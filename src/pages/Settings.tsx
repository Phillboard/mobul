import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your account, team, and preferences
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Platform Configuration
            </CardTitle>
            <CardDescription>
              Settings page coming soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
              <SettingsIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Configuration options
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Manage organizations, users, billing, and system preferences
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
