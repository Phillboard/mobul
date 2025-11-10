import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Mail, 
  Users, 
  BarChart3, 
  TrendingUp, 
  ArrowRight,
  Package,
  DollarSign
} from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      name: "Active Campaigns",
      value: "12",
      change: "+3 this week",
      icon: Mail,
      color: "text-primary",
    },
    {
      name: "Total Recipients",
      value: "45.2K",
      change: "+12% from last month",
      icon: Users,
      color: "text-accent",
    },
    {
      name: "Delivery Rate",
      value: "96.8%",
      change: "+2.1% improvement",
      icon: Package,
      color: "text-success",
    },
    {
      name: "Response Rate",
      value: "8.4%",
      change: "+1.2% from avg",
      icon: TrendingUp,
      color: "text-warning",
    },
  ];

  const recentCampaigns = [
    {
      name: "Spring Roofing Promo",
      vertical: "Roofing",
      status: "In-Transit",
      mailed: 5420,
      delivered: 4890,
      scans: 412,
    },
    {
      name: "REI Cash Offer Q2",
      vertical: "REI/Flippers",
      status: "Delivered",
      mailed: 8200,
      delivered: 7934,
      scans: 687,
    },
    {
      name: "Service Reminder Auto",
      vertical: "Auto Dealership",
      status: "In Production",
      mailed: 3100,
      delivered: 0,
      scans: 0,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Welcome back, Admin</h1>
        <p className="mt-1 text-muted-foreground">
          Here's what's happening with your direct mail campaigns today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Create Campaign
            </CardTitle>
            <CardDescription>
              Design and launch a new direct mail campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Start Campaign
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Import Audience
            </CardTitle>
            <CardDescription>
              Upload contacts or buy targeted leads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground">
              Manage Audiences
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-success/20 bg-gradient-to-br from-success/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-success" />
              View Analytics
            </CardTitle>
            <CardDescription>
              Track performance and attribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full border-success text-success hover:bg-success hover:text-success-foreground">
              View Reports
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>
            Track the status and performance of your latest campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCampaigns.map((campaign) => (
              <div
                key={campaign.name}
                className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-foreground">{campaign.name}</h3>
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">
                      {campaign.vertical}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        campaign.status === "Delivered"
                          ? "bg-success/10 text-success"
                          : campaign.status === "In-Transit"
                          ? "bg-warning/10 text-warning"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                  <div className="mt-2 flex gap-6 text-sm text-muted-foreground">
                    <span>Mailed: {campaign.mailed.toLocaleString()}</span>
                    <span>Delivered: {campaign.delivered.toLocaleString()}</span>
                    <span>Scans: {campaign.scans}</span>
                    {campaign.scans > 0 && (
                      <span className="text-success">
                        CTR: {((campaign.scans / campaign.mailed) * 100).toFixed(2)}%
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Integration Notice */}
      <Card className="border-primary bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            API-First Platform
          </CardTitle>
          <CardDescription>
            Every feature available through our robust REST API and webhooks. Integrate seamlessly with your existing systems.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Ready to automate?</p>
              <p className="text-xs text-muted-foreground">
                Full OpenAPI spec, SDKs for Node.js & Python, and real-time webhooks
              </p>
            </div>
            <Button variant="outline">
              View API Docs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
