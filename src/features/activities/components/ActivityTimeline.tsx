/**
 * Activity Timeline Component
 * 
 * Displays activities grouped by date in a timeline format.
 * Provides visual distinction between activity types and days.
 */

import { useMemo } from 'react';
import { Activity } from '@/features/activities/hooks';
import { Badge } from "@/shared/components/ui/badge";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Card, CardContent } from "@/shared/components/ui/card";
import { 
  Phone, Mail, Calendar, MessageSquare, FileText, Send, 
  Clock, ArrowRight, ArrowLeft, ChevronRight 
} from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from "date-fns";

interface ActivityTimelineProps {
  activities: Activity[];
  isLoading?: boolean;
  onActivityClick?: (activity: Activity) => void;
}

// Icon mapping for activity types
const activityIcons: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  sms: Send,
  whatsapp: Send,
  postal_mail: FileText,
};

// Color mapping for activity types
const activityColors: Record<string, string> = {
  call: "bg-blue-500",
  email: "bg-green-500",
  meeting: "bg-purple-500",
  note: "bg-yellow-500",
  sms: "bg-pink-500",
  whatsapp: "bg-emerald-500",
  postal_mail: "bg-orange-500",
};

// Direction icons
const directionIcons = {
  inbound: ArrowLeft,
  outbound: ArrowRight,
};

/**
 * Group activities by date
 */
function groupActivitiesByDate(activities: Activity[]): Record<string, Activity[]> {
  return activities.reduce((groups, activity) => {
    const date = activity.completed_at || activity.scheduled_at || activity.created_at;
    const dateKey = format(parseISO(date), 'yyyy-MM-dd');
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(activity);
    
    return groups;
  }, {} as Record<string, Activity[]>);
}

/**
 * Format date header
 */
function formatDateHeader(dateString: string): string {
  const date = parseISO(dateString);
  
  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'EEEE, MMMM d, yyyy');
}

/**
 * Format activity time
 */
function formatActivityTime(activity: Activity): string {
  const date = activity.completed_at || activity.scheduled_at || activity.created_at;
  return format(parseISO(date), 'h:mm a');
}

/**
 * Get relative time
 */
function getRelativeTime(activity: Activity): string {
  const date = activity.completed_at || activity.scheduled_at || activity.created_at;
  return formatDistanceToNow(parseISO(date), { addSuffix: true });
}

export function ActivityTimeline({ 
  activities, 
  isLoading,
  onActivityClick 
}: ActivityTimelineProps) {
  // Group activities by date
  const groupedActivities = useMemo(() => {
    return groupActivitiesByDate(activities);
  }, [activities]);

  // Sort dates in descending order (most recent first)
  const sortedDates = useMemo(() => {
    return Object.keys(groupedActivities).sort((a, b) => b.localeCompare(a));
  }, [groupedActivities]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4 pl-8">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No activities yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Activities will appear here when they're logged
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sortedDates.map((dateKey) => (
        <div key={dateKey}>
          {/* Date Header */}
          <div className="sticky top-0 z-10 bg-background pb-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {formatDateHeader(dateKey)}
            </h3>
          </div>

          {/* Timeline for this date */}
          <div className="relative pl-8 border-l-2 border-muted ml-4">
            {groupedActivities[dateKey].map((activity, index) => {
              const Icon = activityIcons[activity.activity_type] || FileText;
              const colorClass = activityColors[activity.activity_type] || "bg-gray-500";
              const DirectionIcon = activity.direction 
                ? directionIcons[activity.direction] 
                : null;

              return (
                <div 
                  key={activity.id}
                  className={`relative pb-6 ${
                    index === groupedActivities[dateKey].length - 1 ? 'pb-0' : ''
                  }`}
                >
                  {/* Timeline dot */}
                  <div 
                    className={`absolute -left-[25px] w-4 h-4 rounded-full ${colorClass} border-4 border-background`}
                  />

                  {/* Activity card */}
                  <Card 
                    className={`ml-4 cursor-pointer transition-all hover:shadow-md hover:border-primary/50 ${
                      onActivityClick ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => onActivityClick?.(activity)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full ${colorClass} flex items-center justify-center`}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm">{activity.subject}</h4>
                                {DirectionIcon && (
                                  <DirectionIcon className="h-3 w-3 text-muted-foreground" />
                                )}
                              </div>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                  {activity.description}
                                </p>
                              )}
                            </div>

                            {/* Time */}
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs font-medium">
                                {formatActivityTime(activity)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {getRelativeTime(activity)}
                              </span>
                            </div>
                          </div>

                          {/* Metadata */}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <Badge variant="outline" className="text-xs capitalize">
                              {activity.activity_type.replace('_', ' ')}
                            </Badge>

                            {activity.direction && (
                              <Badge variant="secondary" className="text-xs capitalize">
                                {activity.direction}
                              </Badge>
                            )}

                            {activity.outcome && (
                              <Badge variant="secondary" className="text-xs">
                                {activity.outcome}
                              </Badge>
                            )}

                            {activity.duration_minutes && (
                              <Badge variant="outline" className="text-xs">
                                {activity.duration_minutes} min
                              </Badge>
                            )}

                            {/* Related entities */}
                            {activity.contacts && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" />
                                {activity.contacts.first_name} {activity.contacts.last_name}
                              </span>
                            )}

                            {activity.companies && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <ChevronRight className="h-3 w-3" />
                                {activity.companies.company_name}
                              </span>
                            )}
                          </div>

                          {/* Logged by */}
                          {activity.profiles && (
                            <div className="text-xs text-muted-foreground mt-2">
                              by {activity.profiles.full_name}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ActivityTimeline;
