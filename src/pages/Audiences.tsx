import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, ShoppingCart, Users as UsersIcon } from "lucide-react";

export default function Audiences() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audiences & Leads</h1>
          <p className="mt-1 text-muted-foreground">
            Import contacts, buy targeted leads, and manage your mailing lists
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                Import Audience
              </CardTitle>
              <CardDescription>
                Upload CSV/XLSX with automatic CASS, NCOA validation, and deduplication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-8 text-center">
                  <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    Drag and drop your file here, or click to browse
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Supports up to 250k rows per batch
                  </p>
                </div>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                  Choose File
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-accent" />
                Lead Marketplace
              </CardTitle>
              <CardDescription>
                Purchase verified leads filtered by vertical, geography, and demographics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-medium">Roofing</span>
                    <Button variant="outline" size="sm">Browse</Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-medium">REI / Flippers</span>
                    <Button variant="outline" size="sm">Browse</Button>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-medium">Auto Dealerships</span>
                    <Button variant="outline" size="sm">Browse</Button>
                  </div>
                </div>
                <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                  Explore Marketplace
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              Saved Audiences
            </CardTitle>
            <CardDescription>
              View and manage your segmented contact lists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
              <UsersIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No audiences yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Import your first contact list or purchase leads to get started
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
