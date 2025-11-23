import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DASHBOARD_WIDGETS, DashboardWidget } from '@/config/dashboardWidgets';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DashboardSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hiddenWidgets: string[];
  onToggleWidget: (widgetId: string) => void;
  onResetToDefaults: () => void;
}

export function DashboardSettingsDialog({
  open,
  onOpenChange,
  hiddenWidgets,
  onToggleWidget,
  onResetToDefaults,
}: DashboardSettingsDialogProps) {
  const groupedWidgets = DASHBOARD_WIDGETS.reduce((acc, widget) => {
    if (!acc[widget.category]) acc[widget.category] = [];
    acc[widget.category].push(widget);
    return acc;
  }, {} as Record<string, DashboardWidget[]>);

  const categoryLabels: Record<string, string> = {
    kpi: 'Key Performance Indicators',
    summary: 'Summary Cards',
    chart: 'Charts & Analytics',
    actions: 'Quick Actions',
    list: 'Lists & Activity',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Customize Dashboard</DialogTitle>
          <DialogDescription>
            Choose which widgets to display on your dashboard. You can also drag widgets to rearrange them.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-6">
            {Object.entries(groupedWidgets).map(([category, widgets]) => (
              <div key={category}>
                <h3 className="text-sm font-semibold mb-3 text-foreground">
                  {categoryLabels[category] || category}
                </h3>
                <div className="space-y-2">
                  {widgets.map((widget) => {
                    const Icon = widget.icon;
                    const isVisible = !hiddenWidgets.includes(widget.id);

                    return (
                      <div
                        key={widget.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={isVisible}
                            onCheckedChange={() => onToggleWidget(widget.id)}
                            id={widget.id}
                          />
                          <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <label 
                              htmlFor={widget.id}
                              className="font-medium text-sm cursor-pointer block"
                            >
                              {widget.name}
                            </label>
                            <p className="text-xs text-muted-foreground truncate">
                              {widget.description}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline" className="ml-2 flex-shrink-0">
                          {widget.defaultSize}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex gap-2 pt-4 border-t">
          <Button onClick={onResetToDefaults} variant="outline" className="flex-1">
            Reset to Defaults
          </Button>
          <Button onClick={() => onOpenChange(false)} className="flex-1">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
