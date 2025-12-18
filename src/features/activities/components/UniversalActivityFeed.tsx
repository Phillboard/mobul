import { Activity } from '@/features/activities/hooks';
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Badge } from "@/shared/components/ui/badge";
import { Phone, Mail, Calendar, MessageSquare, FileText, Send } from "lucide-react";
import { format } from "date-fns";

interface UniversalActivityFeedProps {
  activities: Activity[];
  isLoading: boolean;
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  sms: Send,
  whatsapp: Send,
  postal_mail: FileText,
};

const activityColors = {
  call: "bg-blue-500",
  email: "bg-green-500",
  meeting: "bg-purple-500",
  note: "bg-yellow-500",
  sms: "bg-pink-500",
  whatsapp: "bg-emerald-500",
  postal_mail: "bg-orange-500",
};

export function UniversalActivityFeed({ activities, isLoading }: UniversalActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No activities yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.activity_type] || FileText;
        const colorClass = activityColors[activity.activity_type] || "bg-gray-500";

        return (
          <div key={activity.id} className="flex gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-all duration-200">
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${colorClass} flex items-center justify-center`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold">{activity.subject}</h4>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                </div>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {activity.completed_at 
                    ? format(new Date(activity.completed_at), "MMM d, yyyy 'at' h:mm a")
                    : activity.scheduled_at
                    ? format(new Date(activity.scheduled_at), "MMM d, yyyy 'at' h:mm a")
                    : format(new Date(activity.created_at), "MMM d, yyyy 'at' h:mm a")
                  }
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="capitalize">
                  {activity.activity_type.replace('_', ' ')}
                </Badge>
                
                {activity.direction && (
                  <Badge variant="secondary" className="capitalize">
                    {activity.direction}
                  </Badge>
                )}
                
                {activity.outcome && (
                  <Badge variant="secondary">
                    {activity.outcome}
                  </Badge>
                )}

                {activity.contacts && (
                  <span className="text-sm text-muted-foreground">
                    {activity.contacts.first_name} {activity.contacts.last_name}
                  </span>
                )}

                {activity.companies && (
                  <span className="text-sm text-muted-foreground">
                    {activity.companies.company_name}
                  </span>
                )}

                {activity.deals && (
                  <span className="text-sm text-muted-foreground">
                    Deal: {activity.deals.deal_name}
                  </span>
                )}

                {activity.duration_minutes && (
                  <span className="text-sm text-muted-foreground">
                    {activity.duration_minutes} min
                  </span>
                )}
              </div>

              {activity.profiles && (
                <div className="text-sm text-muted-foreground mt-2">
                  Logged by {activity.profiles.full_name}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
