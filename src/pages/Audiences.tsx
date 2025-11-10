import { Layout } from "@/components/layout/Layout";
import { Card, CardContent } from "@/components/ui/card";

export default function Audiences() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Audiences & Leads</h1>
          <p className="text-muted-foreground mt-2">
            Import contacts, buy targeted leads, and manage your mailing lists
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <p>Audiences page loading...</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
