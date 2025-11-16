import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/contexts/TenantContext";
import { useToast } from "@/hooks/use-toast";
import { UserCircle2, Search, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ImpersonateUserDialogProps {
  trigger: React.ReactNode;
}

export function ImpersonateUserDialog({ trigger }: ImpersonateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const { setImpersonatedUserId } = useTenant();
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ['all-users', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name
        `)
        .order('email');

      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get roles for each user
      const usersWithRoles = await Promise.all(
        (data || []).map(async (user) => {
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .limit(1);
          
          return {
            ...user,
            role: roles?.[0]?.role || 'No role',
          };
        })
      );

      return usersWithRoles;
    },
    enabled: open,
  });

  const handleImpersonate = async () => {
    if (!selectedUserId || !reason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a user and provide a reason for impersonation.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get current user id from auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Log the impersonation
      const { error } = await supabase.from('admin_impersonations').insert({
        admin_user_id: user.id,
        impersonated_user_id: selectedUserId,
        reason: reason.trim(),
        ip_address: window.location.hostname,
      });

      if (error) throw error;

      setImpersonatedUserId(selectedUserId);
      toast({
        title: "Impersonation Started",
        description: "You are now viewing as the selected user. Exit impersonation when done.",
      });
      setOpen(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectedUser = users?.find(u => u.id === selectedUserId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCircle2 className="h-5 w-5" />
            Impersonate User
          </DialogTitle>
          <DialogDescription>
            View the platform as another user. All actions will be logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>Search Users</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* User List */}
          <div className="space-y-2">
            <Label>Select User</Label>
            <ScrollArea className="h-[200px] border border-border rounded-md">
              <div className="p-2 space-y-1">
                {isLoading ? (
                  <p className="text-sm text-muted-foreground p-2">Loading users...</p>
                ) : users && users.length > 0 ? (
                  users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full text-left p-2 rounded-md transition-colors ${
                        selectedUserId === user.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{user.full_name || 'No name'}</p>
                          <p className="text-xs opacity-70">{user.email}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground p-2">No users found</p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Impersonation *</Label>
            <Textarea
              id="reason"
              placeholder="Describe why you need to impersonate this user..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Warning */}
          <div className="flex gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-600">
              All actions during impersonation will be logged. Session will auto-expire after 1 hour.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleImpersonate}
            disabled={!selectedUserId || !reason.trim()}
          >
            Start Impersonation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
