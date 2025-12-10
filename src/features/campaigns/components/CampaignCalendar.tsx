/**
 * CampaignCalendar Component
 * 
 * Calendar view for visualizing campaign mail dates and schedule.
 */

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from '@core/services/supabase';
import { useTenant } from '@app/providers/TenantProvider';
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Megaphone,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
} from "date-fns";
import { cn } from '@shared/utils/cn';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-400',
  scheduled: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  mailing: 'bg-purple-500',
  active: 'bg-green-500',
  completed: 'bg-green-700',
  paused: 'bg-orange-500',
  cancelled: 'bg-red-500',
};

interface Campaign {
  id: string;
  name: string;
  status: string;
  mail_date: string | null;
  client_id: string;
  clients?: {
    name: string;
  };
}

export function CampaignCalendar() {
  const navigate = useNavigate();
  const { currentClient, isAdminMode } = useTenant();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Fetch campaigns for the current month view
  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['calendar-campaigns', currentClient?.id, format(currentMonth, 'yyyy-MM')],
    queryFn: async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);

      let query = supabase
        .from('campaigns')
        .select('id, name, status, mail_date, client_id, clients(name)')
        .gte('mail_date', start.toISOString())
        .lte('mail_date', end.toISOString())
        .not('mail_date', 'is', null)
        .order('mail_date');

      if (currentClient && !isAdminMode) {
        query = query.eq('client_id', currentClient.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Campaign[];
    },
  });

  // Group campaigns by date
  const campaignsByDate = useMemo(() => {
    const grouped = new Map<string, Campaign[]>();
    campaigns.forEach(campaign => {
      if (campaign.mail_date) {
        const dateKey = format(parseISO(campaign.mail_date), 'yyyy-MM-dd');
        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(campaign);
      }
    });
    return grouped;
  }, [campaigns]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    const days: Date[] = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentMonth]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Campaign Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
          {calendarDays.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayCampaigns = campaignsByDate.get(dateKey) || [];
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[100px] p-1 bg-background transition-colors",
                  !isCurrentMonth && "bg-muted/30",
                  today && "ring-2 ring-primary ring-inset"
                )}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 p-1 rounded",
                  today && "bg-primary text-primary-foreground inline-block",
                  !isCurrentMonth && "text-muted-foreground"
                )}>
                  {format(day, 'd')}
                </div>

                {/* Campaign items */}
                <div className="space-y-1">
                  <TooltipProvider>
                    {dayCampaigns.slice(0, 3).map(campaign => (
                      <Tooltip key={campaign.id}>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => navigate(`/campaigns/${campaign.id}`)}
                            className={cn(
                              "w-full text-left px-1.5 py-0.5 rounded text-xs truncate text-white",
                              STATUS_COLORS[campaign.status] || 'bg-gray-500'
                            )}
                          >
                            {campaign.name}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <div className="space-y-1">
                            <div className="font-medium">{campaign.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {campaign.clients?.name}
                            </div>
                            <Badge variant="secondary" className="text-xs">
                              {campaign.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                  
                  {dayCampaigns.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center">
                      +{dayCampaigns.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          {Object.entries(STATUS_COLORS).slice(0, 5).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={cn("w-3 h-3 rounded", color)} />
              <span className="text-xs text-muted-foreground capitalize">
                {status.replace('_', ' ')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

