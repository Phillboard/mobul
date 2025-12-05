import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { useTenant } from '@app/providers/TenantProvider';

interface FormContext {
  companyName: string;
  industry: string;
  activeCampaigns: Array<{ id: string; name: string; status: string }>;
  giftCardBrands: string[];
  hasData: boolean;
}

/**
 * Hook to gather client-specific context for AI form generation and templates
 */
export function useFormContext(clientId?: string) {
  const { currentClient, clients } = useTenant();
  const client = clientId ? clients.find(c => c.id === clientId) : currentClient;
  
  // Fetch campaigns for this client
  const { data: campaigns } = useQuery({
    queryKey: ["campaigns", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, name, status")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!client?.id,
  });

  // Fetch gift card brands available for this client
  const { data: giftCardBrands } = useQuery({
    queryKey: ["client-gift-card-brands", client?.id],
    queryFn: async () => {
      if (!client?.id) return [];
      
      const { data, error } = await supabase
        .from("client_gift_cards")
        .select(`
          gift_card_brands (
            brand_name
          )
        `)
        .eq("client_id", client.id)
        .eq("is_active", true)
        .limit(3);
      
      if (error) {
        console.error("Error fetching gift card brands:", error);
        return [];
      }
      
      // Extract unique brand names
      const brands = data
        ?.map(item => item.gift_card_brands?.brand_name)
        .filter(Boolean) || [];
      
      return [...new Set(brands)];
    },
    enabled: !!client?.id,
  });

  const brandNames = giftCardBrands || [];

  const activeCampaigns = campaigns?.filter(c => c.status === 'draft' || c.status === 'in_production') || [];

  const context: FormContext = {
    companyName: client?.name || "Your Company",
    industry: client?.industry || "general",
    activeCampaigns,
    giftCardBrands: brandNames,
    hasData: !!client && (activeCampaigns.length > 0 || brandNames.length > 0),
  };

  /**
   * Generate contextual example prompts based on company data
   */
  const getContextualPrompts = (): string[] => {
    const prompts: string[] = [];
    const company = context.companyName;
    const industry = context.industry;

    // Industry-specific prompts
    if (industry === 'automotive' || industry === 'warranty') {
      prompts.push(
        `Create a vehicle information update form for ${company} customers. Include make, model, mileage, and service preferences. Offer a gift card incentive.`,
        `Post-service feedback form for ${company}. Collect satisfaction rating, service date, vehicle details, and contact preferences.`,
        `Extended warranty interest form for ${company}. Gather vehicle info, current coverage details, and interest level.`
      );
    } else if (industry === 'insurance') {
      prompts.push(
        `Policy information update form for ${company}. Collect address changes, phone updates, and coverage preferences.`,
        `Claims satisfaction survey for ${company} with gift card reward. Include claim details, satisfaction rating, and feedback.`,
        `New coverage interest form for ${company}. Gather current policy info and additional coverage needs.`
      );
    } else if (industry === 'healthcare') {
      prompts.push(
        `Patient information update form for ${company}. Collect contact info, insurance updates, and appointment preferences.`,
        `Post-visit satisfaction survey for ${company} with gift card thank you. Include visit details and feedback.`
      );
    } else if (industry === 'real_estate') {
      prompts.push(
        `Property interest form for ${company}. Collect buyer preferences, budget, location needs, and contact info.`,
        `Client feedback form for ${company} after closing. Include satisfaction rating and referral willingness.`
      );
    }

    // Add campaign-specific prompts if available
    if (activeCampaigns.length > 0) {
      const campaignName = activeCampaigns[0].name;
      prompts.push(
        `Follow-up form for ${company}'s "${campaignName}" campaign. Collect updated contact info and campaign feedback.`
      );
    }

    // Generic fallback prompts
    if (prompts.length === 0) {
      prompts.push(
        `Create a customer feedback form for ${company} with gift card incentive. Include name, email, rating, and comments.`,
        `Contact information update form for ${company}. Collect name, email, phone, address, and communication preferences.`,
        `Quick satisfaction survey for ${company} with gift card reward. Include overall rating and open feedback.`
      );
    }

    return prompts.slice(0, 4);
  };

  return {
    context,
    getContextualPrompts,
  };
}
