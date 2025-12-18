/**
 * Schedule Selector Component
 * 
 * Choose when to send the campaign.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Button } from "@/shared/components/ui/button";
import { Send, Clock, CalendarIcon, Zap } from "lucide-react";
import { format } from "date-fns";
import type { CampaignBuilderFormData } from "../../types";
import { cn } from "@shared/utils/cn";

interface Props {
  scheduleType: 'immediate' | 'scheduled' | 'follow_up';
  scheduledAt?: Date;
  followUpDelayDays?: number;
  followUpTrigger?: 'sent' | 'delivered';
  isFollowUp: boolean;
  onChange: (updates: Partial<CampaignBuilderFormData>) => void;
}

const scheduleOptions = [
  {
    id: 'immediate',
    icon: <Send className="h-5 w-5" />,
    title: 'Send Immediately',
    description: 'Send as soon as the campaign is created',
  },
  {
    id: 'scheduled',
    icon: <Clock className="h-5 w-5" />,
    title: 'Schedule for Later',
    description: 'Choose a specific date and time',
  },
];

export function ScheduleSelector({
  scheduleType,
  scheduledAt,
  followUpDelayDays,
  followUpTrigger,
  isFollowUp,
  onChange,
}: Props) {
  const handleScheduleTypeChange = (type: string) => {
    onChange({ schedule_type: type as any });
  };

  const handleDateChange = (date: Date | undefined) => {
    onChange({ scheduled_at: date });
  };

  const handleTimeChange = (time: string) => {
    if (scheduledAt) {
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = new Date(scheduledAt);
      newDate.setHours(hours, minutes);
      onChange({ scheduled_at: newDate });
    }
  };

  return (
    <div className="space-y-6">
      {/* Schedule Type Selection */}
      {!isFollowUp && (
        <RadioGroup value={scheduleType} onValueChange={handleScheduleTypeChange}>
          <div className="grid gap-4 md:grid-cols-2">
            {scheduleOptions.map((option) => (
              <div key={option.id}>
                <RadioGroupItem 
                  value={option.id} 
                  id={option.id}
                  className="peer sr-only"
                />
                <Label
                  htmlFor={option.id}
                  className="flex items-start gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-2 peer-data-[state=checked]:ring-primary/20"
                >
                  <div className="p-2 rounded-full bg-muted">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{option.title}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </div>
                </Label>
              </div>
            ))}
          </div>
        </RadioGroup>
      )}

      {/* Scheduled Date/Time */}
      {scheduleType === 'scheduled' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule Date & Time</CardTitle>
            <CardDescription>Choose when to send your campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Date Picker */}
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !scheduledAt && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {scheduledAt ? format(scheduledAt, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={scheduledAt}
                      onSelect={handleDateChange}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Picker */}
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={scheduledAt ? format(scheduledAt, "HH:mm") : ""}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  disabled={!scheduledAt}
                />
              </div>
            </div>

            {scheduledAt && (
              <div className="p-3 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Scheduled for: </span>
                <span className="font-medium">{format(scheduledAt, "EEEE, MMMM d, yyyy 'at' h:mm a")}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Follow-up Configuration */}
      {isFollowUp && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle className="text-base">Follow-up Timing</CardTitle>
            </div>
            <CardDescription>When to send relative to the mail campaign</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Trigger Event</Label>
              <Select
                value={followUpTrigger}
                onValueChange={(value) => onChange({ follow_up_trigger: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sent">After mail is sent</SelectItem>
                  <SelectItem value="delivered">After mail is delivered</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Delay (days)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={90}
                  value={followUpDelayDays || 0}
                  onChange={(e) => onChange({ follow_up_delay_days: parseInt(e.target.value) || 0 })}
                  className="w-24"
                />
                <span className="text-muted-foreground">days after {followUpTrigger || 'trigger'}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <span className="text-muted-foreground">This message will be sent </span>
              <span className="font-medium">
                {followUpDelayDays || 0} days after the mail campaign is {followUpTrigger || 'sent'}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timezone Notice */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Times are shown in your local timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
