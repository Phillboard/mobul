import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TemplateCard } from "./TemplateCard";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateGridProps {
  clientId: string;
  sizeFilter: string;
  industryFilter: string;
}

export function TemplateGrid({ clientId, sizeFilter, industryFilter }: TemplateGridProps) {
  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", clientId, sizeFilter, industryFilter],
    queryFn: async () => {
      let query = supabase
        .from("templates")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (sizeFilter !== "all") {
        query = query.eq("size", sizeFilter as any);
      }

      if (industryFilter !== "all") {
        query = query.eq("industry_vertical", industryFilter as any);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-64 w-full" />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          No templates found. Create your first template to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
      {templates.map((template, index) => (
        <div 
          key={template.id} 
          className="animate-fade-in"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <TemplateCard template={template} />
        </div>
      ))}
    </div>
  );
}
