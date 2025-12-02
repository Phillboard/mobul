/**
 * Organization Hierarchy Business Rules
 * 
 * Centralized business logic for organization relationships and permissions
 */

export interface OrganizationHierarchy {
  platform: {
    id: string;
    name: string;
  };
  agency?: {
    id: string;
    name: string;
    parentPlatformId: string;
  };
  client: {
    id: string;
    name: string;
    parentAgencyId?: string;
  };
}

export interface AccessValidation {
  hasAccess: boolean;
  reason?: string;
  requiredRole?: string;
}

/**
 * Validate organization hierarchy
 */
export function validateOrganizationHierarchy(
  hierarchy: Partial<OrganizationHierarchy>
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Platform is always required as root
  if (!hierarchy.platform) {
    errors.push('Platform configuration is required');
  }

  // If agency exists, validate relationship
  if (hierarchy.agency) {
    if (!hierarchy.agency.parentPlatformId) {
      errors.push('Agency must be linked to a platform');
    }

    if (hierarchy.platform && hierarchy.agency.parentPlatformId !== hierarchy.platform.id) {
      errors.push('Agency parent platform ID does not match platform ID');
    }
  }

  // If client exists, validate relationship
  if (hierarchy.client) {
    // Client must belong to either agency or platform
    if (!hierarchy.client.parentAgencyId && !hierarchy.agency) {
      // Direct platform client - this is allowed
    } else if (hierarchy.client.parentAgencyId && hierarchy.agency) {
      // Agency client - validate relationship
      if (hierarchy.client.parentAgencyId !== hierarchy.agency.id) {
        errors.push('Client parent agency ID does not match agency ID');
      }
    } else if (hierarchy.client.parentAgencyId && !hierarchy.agency) {
      errors.push('Client references agency that does not exist in hierarchy');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if user can access client
 */
export function canAccessClient(
  userRole: string,
  userClientId: string | null,
  userAgencyId: string | null,
  targetClientId: string,
  targetClientAgencyId: string | null
): AccessValidation {
  // Admin can access everything
  if (userRole === 'admin' || userRole === 'platform_admin') {
    return { hasAccess: true };
  }

  // Agency owner can access their clients
  if (userRole === 'agency_owner' && userAgencyId) {
    if (targetClientAgencyId === userAgencyId) {
      return { hasAccess: true };
    }
    return {
      hasAccess: false,
      reason: 'This client belongs to a different agency',
      requiredRole: 'admin',
    };
  }

  // Client user can only access their own client
  if (userRole === 'client_user' || userRole === 'client_admin') {
    if (userClientId === targetClientId) {
      return { hasAccess: true };
    }
    return {
      hasAccess: false,
      reason: 'You can only access your own organization',
    };
  }

  return {
    hasAccess: false,
    reason: 'Insufficient permissions',
  };
}

/**
 * Check if user can manage organization
 */
export function canManageOrganization(
  userRole: string,
  userOrgId: string | null,
  targetOrgId: string,
  targetOrgType: 'platform' | 'agency' | 'client'
): AccessValidation {
  // Platform admin can manage everything
  if (userRole === 'admin' || userRole === 'platform_admin') {
    return { hasAccess: true };
  }

  // Agency owner can manage their agency and clients
  if (userRole === 'agency_owner') {
    if (targetOrgType === 'platform') {
      return {
        hasAccess: false,
        reason: 'Agency owners cannot manage platform settings',
        requiredRole: 'admin',
      };
    }

    if (targetOrgType === 'agency' && userOrgId === targetOrgId) {
      return { hasAccess: true };
    }

    if (targetOrgType === 'client') {
      // Need to verify client belongs to agency (should be checked by caller)
      return { hasAccess: true };
    }

    return {
      hasAccess: false,
      reason: 'You can only manage your own agency',
    };
  }

  // Client admin can only manage their own client
  if (userRole === 'client_admin') {
    if (targetOrgType === 'client' && userOrgId === targetOrgId) {
      return { hasAccess: true };
    }

    return {
      hasAccess: false,
      reason: 'You can only manage your own organization',
    };
  }

  return {
    hasAccess: false,
    reason: 'Insufficient permissions to manage organizations',
    requiredRole: 'admin',
  };
}

/**
 * Validate organization archive operation
 */
export function validateArchiveOperation(
  orgType: 'agency' | 'client',
  hasActiveC ampaigns: boolean,
  hasActiveUsers: boolean,
  hasUnresolvedBilling: boolean
): {
  canArchive: boolean;
  warnings: string[];
  blockers: string[];
} {
  const warnings: string[] = [];
  const blockers: string[] = [];

  if (hasActiveCampaigns) {
    blockers.push('Organization has active campaigns that must be completed or cancelled first');
  }

  if (hasActiveUsers) {
    warnings.push('Organization has active users who will lose access');
  }

  if (hasUnresolvedBilling) {
    blockers.push('Organization has unresolved billing issues that must be settled first');
  }

  return {
    canArchive: blockers.length === 0,
    warnings,
    blockers,
  };
}

/**
 * Get cascade archive effects
 */
export function getCascadeArchiveEffects(
  orgType: 'agency' | 'client',
  childClientCount: number = 0,
  childUserCount: number = 0,
  activeCampaignCount: number = 0
): {
  willArchive: string[];
  willDisable: string[];
  warnings: string[];
} {
  const willArchive: string[] = [];
  const willDisable: string[] = [];
  const warnings: string[] = [];

  if (orgType === 'agency') {
    if (childClientCount > 0) {
      willArchive.push(`${childClientCount} client organization(s)`);
      warnings.push('All client data will be archived but preserved');
    }

    if (childUserCount > 0) {
      willDisable.push(`${childUserCount} user account(s)`);
      warnings.push('Users will lose access but can be restored');
    }

    if (activeCampaignCount > 0) {
      warnings.push(`${activeCampaignCount} active campaign(s) will be paused`);
    }
  }

  if (orgType === 'client') {
    if (childUserCount > 0) {
      willDisable.push(`${childUserCount} user account(s) in this client`);
    }

    if (activeCampaignCount > 0) {
      warnings.push(`${activeCampaignCount} campaign(s) will be archived`);
    }
  }

  return {
    willArchive,
    willDisable,
    warnings,
  };
}

/**
 * Validate organization status transition
 */
export function validateStatusTransition(
  currentStatus: string,
  newStatus: string
): {
  valid: boolean;
  reason?: string;
} {
  const validTransitions: Record<string, string[]> = {
    'active': ['suspended', 'archived'],
    'suspended': ['active', 'archived'],
    'archived': [], // Cannot transition from archived
    'pending': ['active', 'rejected'],
    'rejected': ['pending'], // Can reapply
  };

  if (!validTransitions[currentStatus]) {
    return {
      valid: false,
      reason: `Unknown current status: ${currentStatus}`,
    };
  }

  if (!validTransitions[currentStatus].includes(newStatus)) {
    return {
      valid: false,
      reason: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  return { valid: true };
}

