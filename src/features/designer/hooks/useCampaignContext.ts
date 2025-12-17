/**
 * Campaign Context Hook
 * Fetches and provides campaign context for the designer
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/core/services/supabase/client';
import type {  DesignerContext, GiftCardInfo, IndustryVertical } from '../types/context';
import { detectBrand, getBrandStyle } from '../data/brandPresets';
import { getIndustryStyle } from '../data/industryPresets';

interface CampaignQueryResult {
  campaign_id: string;
  campaign_name: string;
  company_name: string;
  industry_vertical: string | null;
  logo_url: string | null;
  phone: string | null;
  website: string | null;
  gift_cards: Array<{
    brand: string;
    amount: number;
    poolId: string;
    logoUrl?: string;
  }>;
}

/**
 * Fetch campaign context for the designer
 */
export function useCampaignContext(clientId: string | undefined): DesignerContext {
  const {
    data,
    isLoading,
    error
  } = useQuery({
    queryKey: ['campaign-context', clientId],
    queryFn: () => fetchCampaignContext(clientId),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return createLoadingContext();
  }

  if (error || !data) {
    return createErrorContext(error?.message);
  }

  return createDesignerContext(data);
}

/**
 * Fetch campaign context from database
 */
async function fetchCampaignContext(
  clientId: string | undefined
): Promise<CampaignQueryResult | null> {
  if (!clientId) return null;

  // Query: Get latest campaign with gift card info
  const { data: campaigns, error: campaignError } = await supabase
    .from('campaigns')
    .select(`
      id,
      name,
      client:clients!inner (
        id,
        name,
        industry_vertical,
        logo_url,
        phone,
        website
      ),
      campaign_reward_configs!inner (
        pool:gift_card_pools!inner (
          id,
          brand,
          denomination,
          logo_url
        )
      )
    `)
    .eq('client_id', clientId)
    .in('status', ['completed', 'mailed', 'active', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (campaignError) {
    console.error('[useCampaignContext] Campaign query error:', campaignError);
    
    // Fallback: Try to get client info directly
    const { data: client } = await supabase
      .from('clients')
      .select('id, name, industry_vertical, logo_url, phone, website')
      .eq('id', clientId)
      .single();

    if (client) {
      return {
        campaign_id: '',
        campaign_name: '',
        company_name: client.name,
        industry_vertical: client.industry_vertical,
        logo_url: client.logo_url,
        phone: client.phone,
        website: client.website,
        gift_cards: [],
      };
    }
    
    return null;
  }

  if (!campaigns) return null;

  // Transform nested data
  const client = campaigns.client as any;
  const rewardConfigs = campaigns.campaign_reward_configs as any[];
  
  const giftCards = rewardConfigs
    .map((config: any) => ({
      brand: config.pool.brand,
      amount: config.pool.denomination,
      poolId: config.pool.id,
      logoUrl: config.pool.logo_url,
    }))
    .filter(Boolean);

  return {
    campaign_id: campaigns.id,
    campaign_name: campaigns.name,
    company_name: client.name,
    industry_vertical: client.industry_vertical,
    logo_url: client.logo_url,
    phone: client.phone,
    website: client.website,
    gift_cards: giftCards,
  };
}

/**
 * Transform query result into DesignerContext
 */
function createDesignerContext(data: CampaignQueryResult | null): DesignerContext {
  if (!data) {
    return createEmptyContext();
  }

  // Extract company info
  const company = {
    name: data.company_name || 'Your Company',
    logo: data.logo_url || undefined,
    phone: data.phone || undefined,
    website: data.website || undefined,
  };

  // Extract industry info
  const industryVertical = (data.industry_vertical as IndustryVertical) || 'other';
  const industry = getIndustryStyle(industryVertical);

  // Extract gift card info (use first one as primary)
  let giftCard: GiftCardInfo | null = null;
  let brandStyle = null;
  
  if (data.gift_cards && data.gift_cards.length > 0) {
    const firstCard = data.gift_cards[0];
    const brandKey = detectBrand(firstCard.brand);
    
    giftCard = {
      brand: firstCard.brand,
      brandKey,
      amount: firstCard.amount,
      poolId: firstCard.poolId,
      logoUrl: firstCard.logoUrl,
    };
    
    brandStyle = getBrandStyle(brandKey);
  }

  // Determine context strength
  const hasGiftCard = !!giftCard;
  const hasCompany = !!company.name && company.name !== 'Your Company';
  const hasIndustry = industryVertical !== 'other';

  let contextStrength: 'full' | 'partial' | 'none' = 'none';
  if (hasGiftCard && hasCompany && hasIndustry) {
    contextStrength = 'full';
  } else if (hasGiftCard || hasCompany) {
    contextStrength = 'partial';
  }

  return {
    campaign: {
      id: data.campaign_id,
      name: data.campaign_name,
      type: 'direct-mail',
    },
    company,
    industry,
    giftCard,
    brandStyle,
    hasContext: hasGiftCard || hasCompany,
    contextStrength,
    isLoading: false,
  };
}

/**
 * Create loading context
 */
function createLoadingContext(): DesignerContext {
  return {
    campaign: null,
    company: {
      name: 'Loading...',
    },
    industry: getIndustryStyle('other'),
    giftCard: null,
    brandStyle: null,
    hasContext: false,
    contextStrength: 'none',
    isLoading: true,
  };
}

/**
 * Create error context
 */
function createErrorContext(errorMessage?: string): DesignerContext {
  return {
    campaign: null,
    company: {
      name: 'Your Company',
    },
    industry: getIndustryStyle('other'),
    giftCard: null,
    brandStyle: null,
    hasContext: false,
    contextStrength: 'none',
    isLoading: false,
    error: errorMessage || 'Failed to load campaign context',
  };
}

/**
 * Create empty context (no campaign data)
 */
function createEmptyContext(): DesignerContext {
  return {
    campaign: null,
    company: {
      name: 'Your Company',
    },
    industry: getIndustryStyle('other'),
    giftCard: null,
    brandStyle: null,
    hasContext: false,
    contextStrength: 'none',
    isLoading: false,
  };
}
