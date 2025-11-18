import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AcceptInviteRequest {
  token: string;
  password: string;
  fullName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { token, password, fullName }: AcceptInviteRequest = await req.json();

    if (!token || !password || !fullName) {
      throw new Error("Token, password, and full name are required");
    }

    // Get invitation
    const { data: invitation, error: inviteError } = await supabase
      .from("user_invitations")
      .select("*")
      .eq("token", token)
      .single();

    if (inviteError || !invitation) {
      throw new Error("Invalid invitation token");
    }

    // Check invitation status
    if (invitation.status !== "pending") {
      throw new Error(`Invitation is ${invitation.status}`);
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      await supabase
        .from("user_invitations")
        .update({ status: "expired" })
        .eq("id", invitation.id);
      throw new Error("Invitation has expired");
    }

    // Create user account
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: invitation.email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (authError) throw authError;

    // Update profile
    await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", authData.user.id);

    // Assign role
    await supabase
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: invitation.role,
      });

    // Add to org if specified
    if (invitation.org_id) {
      await supabase
        .from("org_members")
        .insert({
          user_id: authData.user.id,
          org_id: invitation.org_id,
          role: invitation.role,
        });
    }

    // Add to client if specified
    if (invitation.client_id) {
      await supabase
        .from("client_users")
        .insert({
          user_id: authData.user.id,
          client_id: invitation.client_id,
        });
    }

    // Mark invitation as accepted
    await supabase
      .from("user_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    return new Response(
      JSON.stringify({
        success: true,
        user: authData.user,
        message: "Invitation accepted successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error accepting invitation:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
