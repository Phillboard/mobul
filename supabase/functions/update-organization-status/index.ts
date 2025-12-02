/**
 * Update Organization Status Edge Function
 * 
 * Server-side organization status updates with validation and cascade logic
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { withApiGateway } from '../_shared/api-gateway.ts';
import { OrganizationUpdateSchema } from '../_shared/schemas/validation.ts';
import {
  validateStatusTransition,
  validateArchiveOperation,
  getCascadeArchiveEffects,
} from '../_shared/business-rules/organization-rules.ts';

interface UpdateOrganizationRequest {
  organizationId: string;
  organizationType: 'agency' | 'client';
  status: string;
  reason?: string;
  cascadeArchive?: boolean;
}

interface UpdateOrganizationResponse {
  success: boolean;
  organizationId: string;
  newStatus: string;
  cascadeEffects?: {
    archivedClients?: number;
    disabledUsers?: number;
    pausedCampaigns?: number;
  };
  warnings: string[];
}

serve(
  withApiGateway<UpdateOrganizationRequest, UpdateOrganizationResponse>(
    async (request, context) => {
      const {
        organizationId,
        organizationType,
        status: newStatus,
        reason,
        cascadeArchive = false,
      } = request;

      console.log('[UPDATE-ORG] Updating organization:', {
        organizationId,
        organizationType,
        newStatus,
      });

      const warnings: string[] = [];

      // Get current organization status
      const table = organizationType === 'agency' ? 'agencies' : 'clients';
      const { data: org, error: orgError } = await context.client!
        .from(table)
        .select('*')
        .eq('id', organizationId)
        .single();

      if (orgError || !org) {
        throw new Error(`${organizationType} not found`);
      }

      const currentStatus = org.status || 'active';

      // Validate status transition
      const transitionValidation = validateStatusTransition(currentStatus, newStatus);
      if (!transitionValidation.valid) {
        throw new Error(transitionValidation.reason || 'Invalid status transition');
      }

      // If archiving, perform additional validation
      if (newStatus === 'archived') {
        // Check for active campaigns
        const { data: campaigns } = await context.client!
          .from('campaigns')
          .select('id')
          .eq(organizationType === 'agency' ? 'agency_id' : 'client_id', organizationId)
          .in('status', ['active', 'scheduled']);

        // Check for active users
        const { data: users } = await context.client!
          .from('user_roles')
          .select('user_id')
          .eq(organizationType === 'agency' ? 'agency_id' : 'client_id', organizationId)
          .eq('is_active', true);

        // Check for billing issues (simplified)
        const hasUnresolvedBilling = false; // TODO: Implement actual check

        const archiveValidation = validateArchiveOperation(
          organizationType,
          (campaigns?.length || 0) > 0,
          (users?.length || 0) > 0,
          hasUnresolvedBilling
        );

        if (!archiveValidation.canArchive) {
          throw new Error(`Cannot archive: ${archiveValidation.blockers.join(', ')}`);
        }

        warnings.push(...archiveValidation.warnings);

        // Get cascade effects
        const childClientCount = organizationType === 'agency'
          ? (await context.client!.from('clients').select('id', { count: 'exact' }).eq('agency_id', organizationId)).count || 0
          : 0;

        const cascadeEffects = getCascadeArchiveEffects(
          organizationType,
          childClientCount,
          users?.length || 0,
          campaigns?.length || 0
        );

        warnings.push(...cascadeEffects.warnings);

        // Perform cascade if requested
        if (cascadeArchive && organizationType === 'agency') {
          // Archive child clients
          await context.client!
            .from('clients')
            .update({ 
              status: 'archived',
              archived_at: new Date().toISOString(),
              archived_by: context.user.id,
            })
            .eq('agency_id', organizationId);

          // Disable users
          await context.client!
            .from('user_roles')
            .update({ is_active: false })
            .eq('agency_id', organizationId);

          // Pause campaigns
          await context.client!
            .from('campaigns')
            .update({ status: 'paused' })
            .eq('agency_id', organizationId)
            .eq('status', 'active');
        }
      }

      // Update organization status
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'archived') {
        updateData.archived_at = new Date().toISOString();
        updateData.archived_by = context.user.id;
        updateData.archive_reason = reason;
      } else if (newStatus === 'suspended') {
        updateData.suspended_at = new Date().toISOString();
        updateData.suspended_by = context.user.id;
        updateData.suspension_reason = reason;
      }

      const { error: updateError } = await context.client!
        .from(table)
        .update(updateData)
        .eq('id', organizationId);

      if (updateError) {
        throw new Error(`Failed to update organization: ${updateError.message}`);
      }

      return {
        success: true,
        organizationId,
        newStatus,
        cascadeEffects: cascadeArchive ? {
          archivedClients: organizationType === 'agency' ? 
            (await context.client!.from('clients').select('id', { count: 'exact' }).eq('agency_id', organizationId)).count || 0 
            : undefined,
          disabledUsers: (await context.client!.from('user_roles').select('user_id', { count: 'exact' }).eq(organizationType === 'agency' ? 'agency_id' : 'client_id', organizationId).eq('is_active', false)).count || 0,
          pausedCampaigns: (await context.client!.from('campaigns').select('id', { count: 'exact' }).eq(organizationType === 'agency' ? 'agency_id' : 'client_id', organizationId).eq('status', 'paused')).count || 0,
        } : undefined,
        warnings,
      };
    },
    {
      requireAuth: true,
      requiredRole: 'admin', // Only admins can update organization status
      validateSchema: OrganizationUpdateSchema,
      auditAction: 'update_organization_status',
      rateLimitKey: 'update_organization',
    }
  )
);

