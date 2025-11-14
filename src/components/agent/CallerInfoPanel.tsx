import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, User, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CallerInfoPanelProps {
  callSession: any;
}

export function CallerInfoPanel({ callSession }: CallerInfoPanelProps) {
  const recipient = callSession.recipients;
  const isMatched = callSession.match_status === 'matched';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Caller Information</span>
          <Badge variant={isMatched ? "default" : "secondary"}>
            {isMatched ? (
              <>
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Matched
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Unmatched
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone Number */}
        <div className="flex items-start space-x-3">
          <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">Phone Number</p>
            <p className="text-lg font-semibold text-foreground">{callSession.caller_phone}</p>
          </div>
        </div>

        {/* Recipient Info (if matched) */}
        {recipient && (
          <>
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p className="text-base font-medium text-foreground">
                  {recipient.first_name} {recipient.last_name}
                  {recipient.company && (
                    <span className="text-muted-foreground ml-2">({recipient.company})</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Address</p>
                <p className="text-sm text-foreground">
                  {recipient.address1}
                  {recipient.address2 && `, ${recipient.address2}`}
                </p>
                <p className="text-sm text-foreground">
                  {recipient.city}, {recipient.state} {recipient.zip}
                </p>
              </div>
            </div>

            {recipient.email && (
              <div className="flex items-start space-x-3">
                <div className="h-5 w-5 flex items-center justify-center mt-0.5">
                  <span className="text-muted-foreground">@</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-sm text-foreground">{recipient.email}</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Call Timing */}
        <div className="pt-4 border-t border-border">
          <div className="flex items-start space-x-3">
            <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Call Started</p>
              <p className="text-sm text-foreground">
                {formatDistanceToNow(new Date(callSession.call_started_at), { addSuffix: true })}
              </p>
              
              {callSession.call_duration_seconds && (
                <>
                  <p className="text-sm font-medium text-muted-foreground mt-2">Duration</p>
                  <p className="text-sm text-foreground">
                    {Math.floor(callSession.call_duration_seconds / 60)}m {callSession.call_duration_seconds % 60}s
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tracked Number */}
        <div className="pt-4 border-t border-border">
          <p className="text-sm font-medium text-muted-foreground mb-2">Tracked Number</p>
          <p className="text-sm text-foreground">
            {callSession.tracked_phone_numbers?.phone_number}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
