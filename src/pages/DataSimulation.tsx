import { useState, useEffect } from "react";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  Loader2, 
  Play, 
  Trash2,
  Users,
  Mail,
  Phone,
  Gift,
  BarChart3,
  Link2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SimulationStats {
  organizations: number;
  clients: number;
  contacts: number;
  campaigns: number;
  recipients: number;
  events: number;
  callSessions: number;
  giftCards: number;
}

interface ProgressUpdate {
  phase: string;
  progress: number;
  message: string;
  stats?: Partial<SimulationStats>;
}

export default function DataSimulation() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [currentProgress, setCurrentProgress] = useState<ProgressUpdate | null>(null);
  const [stats, setStats] = useState<SimulationStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      // Get simulated data counts
      const { data: orgs } = await supabase
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("is_simulated", true);

      const { data: clients } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .in("id", (await supabase.from("organizations").select("id").eq("is_simulated", true)).data?.map(o => o.id) || []);

      const { data: contacts } = await supabase
        .from("contacts")
        .select("id", { count: "exact", head: true })
        .eq("is_simulated", true);

      const { data: campaigns } = await supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .not("simulation_batch_id", "is", null);

      const { data: recipients } = await supabase
        .from("recipients")
        .select("id", { count: "exact", head: true })
        .eq("is_simulated", true);

      const { data: events } = await supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .in("campaign_id", (await supabase.from("campaigns").select("id").not("simulation_batch_id", "is", null)).data?.map(c => c.id) || []);

      const { data: calls } = await supabase
        .from("call_sessions")
        .select("id", { count: "exact", head: true })
        .in("campaign_id", (await supabase.from("campaigns").select("id").not("simulation_batch_id", "is", null)).data?.map(c => c.id) || []);

      const { data: giftCards } = await supabase
        .from("gift_cards")
        .select("id", { count: "exact", head: true })
        .like("card_code", "DEMO-%");

      setStats({
        organizations: orgs?.length || 0,
        clients: clients?.length || 0,
        contacts: contacts?.length || 0,
        campaigns: campaigns?.length || 0,
        recipients: recipients?.length || 0,
        events: events?.length || 0,
        callSessions: calls?.length || 0,
        giftCards: giftCards?.length || 0,
      });
    } catch (err) {
      console.error("Error loading stats:", err);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setCurrentProgress({ phase: "Starting", progress: 0, message: "Initializing demo data generation..." });

    try {
      const { data, error } = await supabase.functions.invoke("generate-demo-data", {
        body: { scale: "medium" },
      });

      if (error) throw error;

      setCurrentProgress({ 
        phase: "Complete", 
        progress: 100, 
        message: "Demo data generated successfully!",
        stats: data.stats 
      });

      toast.success("Demo data generated successfully!", {
        description: `Created ${data.stats.campaigns} campaigns with ${data.stats.contacts} contacts`,
      });

      await loadStats();
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate demo data");
      toast.error("Generation failed", {
        description: err.message || "An error occurred",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== "DELETE ALL DATA") {
      toast.error("Please type 'DELETE ALL DATA' to confirm");
      return;
    }

    setIsDeleting(true);
    setError(null);
    setShowDeleteDialog(false);
    setCurrentProgress({ phase: "Deleting", progress: 0, message: "Starting data cleanup..." });

    try {
      const { data, error } = await supabase.functions.invoke("cleanup-demo-data", {
        body: { confirmToken: "DELETE_ALL", mode: "full" },
      });

      if (error) throw error;

      setCurrentProgress({ 
        phase: "Complete", 
        progress: 100, 
        message: "All demo data deleted successfully!" 
      });

      toast.success("Demo data deleted successfully!", {
        description: `Removed ${data.deletedRecords} records`,
      });

      setStats(null);
      setDeleteConfirmation("");
    } catch (err: any) {
      console.error("Deletion error:", err);
      setError(err.message || "Failed to delete demo data");
      toast.error("Deletion failed", {
        description: err.message || "An error occurred",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Demo Data Simulation</h1>
          <p className="text-muted-foreground mt-2">
            Generate realistic demo data for investor presentations and testing
          </p>
        </div>

        {/* Warning Alert */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Warning:</strong> This tool creates and deletes large amounts of data. 
            Only use in development/demo environments. The "Clear All Data" option will remove 
            ALL campaign-related data from the system.
          </AlertDescription>
        </Alert>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Display */}
        {currentProgress && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {currentProgress.progress === 100 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Loader2 className="h-5 w-5 animate-spin" />
                )}
                {currentProgress.phase}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={currentProgress.progress} />
              <p className="text-sm text-muted-foreground">{currentProgress.message}</p>
              {currentProgress.stats && (
                <div className="grid grid-cols-4 gap-4 mt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentProgress.stats.campaigns || 0}</div>
                    <div className="text-xs text-muted-foreground">Campaigns</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentProgress.stats.contacts || 0}</div>
                    <div className="text-xs text-muted-foreground">Contacts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentProgress.stats.events || 0}</div>
                    <div className="text-xs text-muted-foreground">Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{currentProgress.stats.callSessions || 0}</div>
                    <div className="text-xs text-muted-foreground">Calls</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats Display */}
        {stats && (
          <Card>
            <CardHeader>
              <CardTitle>Current Demo Data</CardTitle>
              <CardDescription>Overview of simulated data in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.organizations}</div>
                    <div className="text-sm text-muted-foreground">Organizations</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.clients}</div>
                    <div className="text-sm text-muted-foreground">Clients</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.contacts}</div>
                    <div className="text-sm text-muted-foreground">Contacts</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-8 w-8 text-orange-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.campaigns}</div>
                    <div className="text-sm text-muted-foreground">Campaigns</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-8 w-8 text-cyan-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.recipients}</div>
                    <div className="text-sm text-muted-foreground">Recipients</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.events}</div>
                    <div className="text-sm text-muted-foreground">Events</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-8 w-8 text-pink-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.callSessions}</div>
                    <div className="text-sm text-muted-foreground">Call Sessions</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Gift className="h-8 w-8 text-red-500" />
                  <div>
                    <div className="text-2xl font-bold">{stats.giftCards}</div>
                    <div className="text-sm text-muted-foreground">Gift Cards</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Demo Data</CardTitle>
              <CardDescription>
                Create realistic campaign data with contacts, events, calls, and gift card redemptions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">What will be created:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>2-3 demo agencies with 8-10 clients</li>
                  <li>2,000-5,000 contacts across various industries</li>
                  <li>15-25 campaigns in different statuses</li>
                  <li>Realistic mail delivery and engagement events</li>
                  <li>Call tracking sessions and outcomes</li>
                  <li>Gift card redemptions and deliveries</li>
                  <li>Form submissions and conversions</li>
                </ul>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || isDeleting}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Generate Demo Data
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                Estimated time: 30-60 seconds
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Clear All Data</CardTitle>
              <CardDescription>
                Remove ALL campaign-related data from the system (DANGEROUS)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium text-sm">What will be deleted:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>All organizations and clients</li>
                  <li>All contacts and contact lists</li>
                  <li>All campaigns and recipients</li>
                  <li>All events and analytics data</li>
                  <li>All call sessions and recordings</li>
                  <li>All gift card assignments</li>
                  <li>All form submissions</li>
                </ul>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isGenerating || isDeleting}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Clear All Data
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm Data Deletion
              </DialogTitle>
              <DialogDescription>
                This will permanently delete ALL campaign-related data from the system. 
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Label htmlFor="confirmation">
                Type <strong>DELETE ALL DATA</strong> to confirm:
              </Label>
              <Input
                id="confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="DELETE ALL DATA"
                className="font-mono"
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteConfirmation("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteConfirmation !== "DELETE ALL DATA"}
              >
                Delete Everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

