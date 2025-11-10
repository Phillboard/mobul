import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TemplateCard } from "./TemplateCard";
import { TemplateListItem } from "./TemplateListItem";
import { Skeleton } from "@/components/ui/skeleton";

interface TemplateGridProps {
  clientId: string;
  sizeFilter: string;
  industryFilter: string;
  searchQuery: string;
  view: "grid" | "list";
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

const sizeLabels: Record<string, string> = {
  "4x6": "4×6 Postcard",
  "6x9": "6×9 Postcard",
  "6x11": "6×11 Postcard",
  letter: "Letter (#10)",
  trifold: "Tri-fold Self-Mailer",
};

const industryLabels: Record<string, string> = {
  roofing: "Roofing",
  rei: "Real Estate Investment",
  auto_service: "Auto Service",
  auto_warranty: "Auto Warranty",
  auto_buyback: "Auto Buyback",
};

export function TemplateGrid({ 
  clientId, 
  sizeFilter, 
  industryFilter, 
  searchQuery,
  view,
  selectedIds,
  onToggleSelect 
}: TemplateGridProps) {
  const { data: allTemplates, isLoading } = useQuery({
    queryKey: ["templates", clientId, sizeFilter, industryFilter],
    queryFn: async () => {
      let query = supabase
        .from("templates")
        .select("*")
        .eq("client_id", clientId)
        .order("is_favorite", { ascending: false })
        .order("updated_at", { ascending: false });

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

  // Filter by search query
  const templates = allTemplates?.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate favorites and recent
  const favoriteTemplates = templates?.filter((t) => t.is_favorite);
  const recentTemplates = templates?.filter((t) => !t.is_favorite).slice(0, 8);
  const otherTemplates = templates?.filter((t) => !t.is_favorite).slice(8);

  if (isLoading) {
    return (
      <div className={view === "grid" 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
        : "space-y-4"
      }>
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className={view === "grid" ? "h-80 w-full" : "h-40 w-full"} />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {searchQuery 
            ? `No templates found matching "${searchQuery}"`
            : "No templates found. Create your first template to get started."
          }
        </p>
      </div>
    );
  }

  const renderTemplates = (templateList: any[], title?: string) => {
    if (!templateList || templateList.length === 0) return null;

    return (
      <div className="space-y-4">
        {title && (
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {title}
            <span className="text-sm font-normal text-muted-foreground">
              ({templateList.length})
            </span>
          </h2>
        )}
        {view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {templateList.map((template, index) => (
              <div
                key={template.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TemplateCard
                  template={template}
                  isSelected={selectedIds.includes(template.id)}
                  onToggleSelect={onToggleSelect}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {templateList.map((template, index) => (
              <div
                key={template.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TemplateListItem
                  template={template}
                  isSelected={selectedIds.includes(template.id)}
                  onToggleSelect={onToggleSelect}
                  sizeLabels={sizeLabels}
                  industryLabels={industryLabels}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {favoriteTemplates && favoriteTemplates.length > 0 && renderTemplates(favoriteTemplates, "⭐ Favorites")}
      {recentTemplates && recentTemplates.length > 0 && renderTemplates(recentTemplates, "🕐 Recent")}
      {otherTemplates && otherTemplates.length > 0 && renderTemplates(otherTemplates, "📁 All Templates")}
    </div>
  );
}
