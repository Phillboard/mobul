import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/contexts/TenantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ImpersonationBanner() {
  const { impersonatedUserId, setImpersonatedUserId } = useTenant();
  const { toast } = useToast();
  const [timeRemaining, setTimeRemaining] = useState<number>(3600); // 1 hour in seconds

  const { data: impersonatedUser } = useQuery({
    queryKey: ['impersonated-user', impersonatedUserId],
    queryFn: async () => {
      if (!impersonatedUserId) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', impersonatedUserId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!impersonatedUserId,
  });

  useEffect(() => {
    if (!impersonatedUserId) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleExitImpersonation();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [impersonatedUserId]);

  const handleExitImpersonation = async () => {
    try {
      // Update the impersonation record to set ended_at
      const { error } = await supabase
        .from('admin_impersonations')
        .update({ ended_at: new Date().toISOString() })
        .eq('impersonated_user_id', impersonatedUserId)
        .is('ended_at', null);

      if (error) throw error;

      setImpersonatedUserId(null);
      setTimeRemaining(3600);
      
      toast({
        title: "Impersonation Ended",
        description: "You have exited impersonation mode.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!impersonatedUserId) return null;

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  return (
    <Alert className="fixed top-0 left-0 right-0 z-50 rounded-none border-0 border-b bg-destructive text-destructive-foreground">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="font-bold uppercase tracking-wide">
          ⚠️ Viewing as {impersonatedUser?.full_name || impersonatedUser?.email || 'User'} - 
          Session expires in {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExitImpersonation}
          className="ml-4 bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90"
        >
          <X className="h-4 w-4 mr-1" />
          Exit Impersonation
        </Button>
      </AlertDescription>
    </Alert>
  );
}
