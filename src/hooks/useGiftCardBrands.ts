import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useGiftCardBrands() {
  return useQuery({
    queryKey: ["gift-card-brands"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gift_card_brands")
        .select("*")
        .eq("is_active", true)
        .order("brand_name");
      
      if (error) throw error;
      return data;
    },
  });
}
