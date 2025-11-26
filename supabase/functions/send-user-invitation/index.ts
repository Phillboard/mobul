import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  email: string;
  role: string;
  orgId?: string;
  clientId?: string;
  message?: string;
}

const VALID_ROLES = ["admin", "tech_support", "agency_owner", "company_owner", "developer", "call_center"];

const roleRequirements: Record<string, { requiresOrg: boolean; requiresClient: boolean }> = {
  admin: { requiresOrg: false, requiresClient: false },
  tech_support: { requiresOrg: false, requiresClient: false },
  agency_owner: { requiresOrg: true, requiresClient: false },
  company_owner: { requiresOrg: false, requiresClient: true },
  developer: { requiresOrg: false, requiresClient: false },
  call_center: { requiresOrg: false, requiresClient: true },
};

const roleHierarchy: Record<string, string[]> = {
  admin: ["admin", "tech_support", "agency_owner", "company_owner", "developer", "call_center"],
  tech_support: ["agency_owner", "company_owner", "developer", "call_center"],
  agency_owner: ["company_owner", "call_center"],
  company_owner: ["call_center"],
  developer: [],
  call_center: [],
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the user from the request
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { email, role, orgId, clientId, message }: InvitationRequest = await req.json();

    // Validate required fields
    if (!email || !role) {
      throw new Error("Email and role are required");
    }

    // Validate role is a valid app_role
    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Invalid role: ${role}`);
    }

    // Get inviter's role
    const { data: inviterRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!inviterRole) {
      throw new Error("Inviter role not found");
    }

    // Check if inviter can invite this role
    const canInvite = roleHierarchy[inviterRole.role];
    if (!canInvite || !canInvite.includes(role)) {
      throw new Error(`You do not have permission to invite ${role} users`);
    }

    // Validate org/client requirements
    const requirements = roleRequirements[role];
    if (requirements.requiresOrg && !orgId) {
      throw new Error(`Organization is required for ${role} role`);
    }
    if (requirements.requiresClient && !clientId) {
      throw new Error(`Client is required for ${role} role`);
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabase
      .from("user_invitations")
      .select("id")
      .eq("email", email)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      throw new Error("Pending invitation already exists for this email");
    }

    // Get inviter details
    const { data: inviter } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    // Create invitation with role column
    const { data: invitation, error: inviteError } = await supabase
      .from("user_invitations")
      .insert({
        email,
        role,
        org_id: orgId,
        client_id: clientId,
        invited_by: user.id,
        metadata: { message, inviter_name: inviter?.full_name },
      })
      .select()
      .single();

    if (inviteError) throw inviteError;

    // Get organization/client name for email
    let orgName = "the platform";
    if (clientId) {
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", clientId)
        .single();
      orgName = client?.name || "the organization";
    } else if (orgId) {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .single();
      orgName = org?.name || "the organization";
    }

    // Send invitation email
    const inviteUrl = `${req.headers.get("origin")}/accept-invite?token=${invitation.token}`;
    
    const roleDisplay = role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
    
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 You're Invited!</h1>
            </div>
            <div class="content">
              <p>Hi there,</p>
              <p><strong>${inviter?.full_name || inviter?.email}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${roleDisplay}</strong>.</p>
              ${message ? `<p><em>"${message}"</em></p>` : ''}
              <p>Click the button below to accept your invitation and create your account:</p>
              <center>
                <a href="${inviteUrl}" class="button">Accept Invitation</a>
              </center>
              <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
              <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Mobul ACE Platform. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log(`Invitation created for ${email} with role ${role} - Token: ${invitation.token}`);
    console.log(`Invite URL: ${inviteUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        inviteUrl,
        message: "Invitation sent successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error sending invitation:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
