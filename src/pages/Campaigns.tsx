import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Filter, Search, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function Campaigns() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
            <p className="mt-1 text-muted-foreground">
              Create, manage, and track your direct mail campaigns
            </p>
          </div>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Campaign Builder</CardTitle>
                <CardDescription>
                  Drag-and-drop canvas with dynamic QR codes, PURLs, and variable data printing
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search campaigns..." className="pl-9 w-64" />
                </div>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed border-border bg-muted/20 p-12 text-center">
              <Mail className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">No campaigns yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create your first direct mail campaign with our intuitive builder
              </p>
              <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" />
                Create First Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
