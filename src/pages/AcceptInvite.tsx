import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@core/services/supabase";
import { callPublicEdgeFunction } from "@core/api/client";
import { Endpoints } from "@core/api/endpoints";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { toast } from "sonner";
import { Mail, Lock, User, ArrowRight, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  // Get token and handle URL encoding issues (+ becomes space, etc.)
  const rawToken = searchParams.get("token");
  // Restore any + signs that were converted to spaces by URL parsing
  const token = rawToken ? rawToken.replace(/ /g, '+') : null;
  
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Fetch invitation details
  const { data: invitation, isLoading, error } = useQuery({
    queryKey: ["invitation", token],
    enabled: !!token,
    queryFn: async () => {
      if (!token) throw new Error("No invitation token provided");

      console.log("Looking up invitation with token:", token);

      const { data, error } = await supabase
        .from("user_invitations")
        .select("*")
        .eq("token", token)
        .maybeSingle();

      if (error) {
        console.error("Invitation lookup error:", error);
        throw error;
      }
      
      if (!data) {
        throw new Error("Invitation not found. It may have expired or already been used.");
      }
      
      // Check if expired
      if (new Date(data.expires_at) < new Date()) {
        throw new Error("This invitation has expired");
      }

      if (data.status !== "pending") {
        throw new Error(`This invitation has already been ${data.status}`);
      }

      return data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error("No token");
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }

      const data = await callPublicEdgeFunction(
        Endpoints.admin.acceptInvitation,
        {
          token,
          password,
          fullName,
        }
      );

      return data;
    },
    onSuccess: async () => {
      toast.success("Account created successfully! Logging you in...");
      
      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation?.email || "",
        password,
      });

      if (signInError) {
        toast.error("Please sign in manually");
        navigate("/auth");
      } else {
        navigate("/");
      }
    },
    onError: (error: any) => {
      toast.error("Failed to accept invitation", {
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    acceptMutation.mutate();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>No invitation token provided</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">Loading invitation...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              {error?.message || "This invitation is no longer valid"}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Accept Invitation</CardTitle>
          </div>
          <CardDescription>
            You've been invited to join as <strong>{invitation.role?.replace(/_/g, " ")}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Creating account for: <strong>{invitation.email}</strong>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                  minLength={8}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? "Creating Account..." : "Create Account"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
