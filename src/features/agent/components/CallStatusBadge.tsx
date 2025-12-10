import { Badge } from "@/shared/components/ui/badge";
import { Phone, PhoneCall, PhoneOff, PhoneMissed } from "lucide-react";

interface CallStatusBadgeProps {
  status: string;
}

export function CallStatusBadge({ status }: CallStatusBadgeProps) {
  const statusConfig = {
    ringing: {
      label: "Ringing",
      variant: "outline" as const,
      icon: Phone,
      className: "border-blue-500 text-blue-500"
    },
    "in-progress": {
      label: "In Progress",
      variant: "default" as const,
      icon: PhoneCall,
      className: "bg-green-500 hover:bg-green-600"
    },
    completed: {
      label: "Completed",
      variant: "secondary" as const,
      icon: PhoneOff,
      className: ""
    },
    failed: {
      label: "Failed",
      variant: "destructive" as const,
      icon: PhoneMissed,
      className: ""
    },
    busy: {
      label: "Busy",
      variant: "outline" as const,
      icon: PhoneMissed,
      className: "border-yellow-500 text-yellow-500"
    },
    "no-answer": {
      label: "No Answer",
      variant: "outline" as const,
      icon: PhoneMissed,
      className: "border-orange-500 text-orange-500"
    }
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.ringing;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={`text-sm px-3 py-1 ${config.className}`}>
      <Icon className="h-4 w-4 mr-1.5" />
      {config.label}
    </Badge>
  );
}
