import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BulkApproveRequest {
  recipientIds: string[];
  action: "approve" | "reject";
  rejectionReason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user is authenticated and has permission
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user role (must be admin or call_center)
    const { data: userRole, error: roleError } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || !userRole || !["admin", "call_center", "company_owner"].includes(userRole.role)) {
      return new Response(
        JSON.stringify({ error: "Insufficient permissions" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { recipientIds, action, rejectionReason }: BulkApproveRequest = await req.json();

    if (!recipientIds || recipientIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipient IDs provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing bulk ${action} for ${recipientIds.length} codes by user ${user.id}`);

    // Update all recipients
    const newStatus = action === "approve" ? "approved" : "rejected";
    const { data: updatedRecipients, error: updateError } = await supabaseClient
      .from("recipients")
      .update({
        status: newStatus,
        approved_at: action === "approve" ? new Date().toISOString() : null,
        approved_by_user_id: user.id,
        rejection_reason: action === "reject" ? rejectionReason : null,
      })
      .in("id", recipientIds)
      .select();

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    const successCount = updatedRecipients?.length || 0;
    const failedCount = recipientIds.length - successCount;

    // Log bulk action in audit log for each recipient
    const auditLogs = recipientIds.map((recipientId) => ({
      recipient_id: recipientId,
      action: action === "approve" ? "approved" : "rejected",
      performed_by_user_id: user.id,
      metadata: {
        bulk_action: true,
        total_in_batch: recipientIds.length,
        rejection_reason: action === "reject" ? rejectionReason : undefined,
      },
    }));

    const { error: auditError } = await supabaseClient
      .from("recipient_audit_log")
      .insert(auditLogs);

    if (auditError) {
      console.error("Audit log error:", auditError);
      // Don't fail the request if audit logging fails
    }

    console.log(`Bulk ${action} completed: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        successCount,
        failedCount,
        action,
        message: `${action === "approve" ? "Approved" : "Rejected"} ${successCount} codes`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in bulk-approve-codes:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
