import { Layout } from "@/shared/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Info } from "lucide-react";

export default function ContactImport() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Import Contacts</h1>
          <p className="text-muted-foreground mt-1">
            Upload CSV files to add contacts to your database
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            CSV import wizard coming soon. For now, use the Audiences section to import
            recipients for campaigns.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>Import Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              • Include headers: first_name, last_name, email, phone
            </p>
            <p className="text-sm">
              • Optional fields: company, job_title, address, city, state, zip
            </p>
            <p className="text-sm">
              • Custom fields will be automatically extracted and stored
            </p>
            <p className="text-sm">
              • Duplicate emails will be skipped per client
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
