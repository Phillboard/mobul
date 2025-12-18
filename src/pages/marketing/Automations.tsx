/**
 * Automations Page
 * 
 * List of all automated marketing workflows.
 * Focused view for triggered multi-step sequences.
 */

import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AutomationList } from "@/features/marketing/components/AutomationList";

export default function Automations() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Automations</h1>
            <p className="text-muted-foreground">
              Automated multi-step marketing workflows
            </p>
          </div>
          <Button onClick={() => navigate('/marketing/automations/new')}>
            <Zap className="h-4 w-4 mr-2" />
            New Automation
          </Button>
        </div>

        <AutomationList />
      </div>
    </Layout>
  );
}
