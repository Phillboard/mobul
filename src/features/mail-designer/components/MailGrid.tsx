import { useQuery } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import { MailCard } from "./MailCard";
import { MailListItem } from "./MailListItem";
import { Skeleton } from "@/components/ui/skeleton";

interface MailGridProps {
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

export function MailGrid({ 
  clientId, 
  sizeFilter, 
  industryFilter, 
  searchQuery,
  view,
  selectedIds,
  onToggleSelect 
}: MailGridProps) {
  const { data: allMailPieces, isLoading } = useQuery({
    queryKey: ["mail", clientId, sizeFilter, industryFilter],
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
  const mailPieces = allMailPieces?.filter((mailPiece) =>
    mailPiece.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Separate favorites and recent
  const favoriteMailPieces = mailPieces?.filter((m) => m.is_favorite);
  const recentMailPieces = mailPieces?.filter((m) => !m.is_favorite).slice(0, 8);
  const otherMailPieces = mailPieces?.filter((m) => !m.is_favorite).slice(8);

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

  if (!mailPieces || mailPieces.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          {searchQuery 
            ? `No mail pieces found matching "${searchQuery}"`
            : "No mail pieces found. Create your first mail piece to get started."
          }
        </p>
      </div>
    );
  }

  const renderMailPieces = (mailPieceList: any[], title?: string) => {
    if (!mailPieceList || mailPieceList.length === 0) return null;

    return (
      <div className="space-y-4">
        {title && (
          <h2 className="text-xl font-semibold flex items-center gap-2">
            {title}
            <span className="text-sm font-normal text-muted-foreground">
              ({mailPieceList.length})
            </span>
          </h2>
        )}
        {view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {mailPieceList.map((mailPiece, index) => (
              <div
                key={mailPiece.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <MailCard
                  mailPiece={mailPiece}
                  isSelected={selectedIds.includes(mailPiece.id)}
                  onToggleSelect={onToggleSelect}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {mailPieceList.map((mailPiece, index) => (
              <div
                key={mailPiece.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <MailListItem
                  mailPiece={mailPiece}
                  isSelected={selectedIds.includes(mailPiece.id)}
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
      {favoriteMailPieces && favoriteMailPieces.length > 0 && renderMailPieces(favoriteMailPieces, "⭐ Favorites")}
      {recentMailPieces && recentMailPieces.length > 0 && renderMailPieces(recentMailPieces, "🕐 Recent")}
      {otherMailPieces && otherMailPieces.length > 0 && renderMailPieces(otherMailPieces, "📁 All Mail Pieces")}
    </div>
  );
}