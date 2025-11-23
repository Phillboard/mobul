import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Send, Users, FileText, Gift, Phone, BarChart } from 'lucide-react';

export function QuickActionsCard() {
  const navigate = useNavigate();

  const quickActions = [
    { icon: Send, label: 'New Campaign', path: '/campaigns' },
    { icon: Users, label: 'Import Audience', path: '/campaigns' },
    { icon: FileText, label: 'Create Template', path: '/templates' },
    { icon: Gift, label: 'Manage Gift Cards', path: '/gift-cards' },
    { icon: Phone, label: 'Call Center', path: '/call-center' },
    { icon: BarChart, label: 'View Analytics', path: '/analytics' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                className="h-auto flex-col gap-2 p-4 hover:bg-accent"
                onClick={() => navigate(action.path)}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
