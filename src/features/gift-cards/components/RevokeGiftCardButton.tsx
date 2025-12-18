/**
 * RevokeGiftCardButton Component
 * 
 * Admin-only button to revoke a gift card assignment.
 * Includes confirmation dialog with required reason.
 */

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/components/ui/alert-dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Undo2, Loader2 } from "lucide-react";
import { useRevokeGiftCard } from "../hooks/useRevokeGiftCard";
import { useAuth } from "@core/auth/AuthProvider";

interface RevokeGiftCardButtonProps {
  assignmentId: string;
  recipientName?: string;
  cardValue?: number;
  brandName?: string;
  variant?: "default" | "ghost" | "outline" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  showText?: boolean;
  onRevoked?: () => void;
}

export function RevokeGiftCardButton({
  assignmentId,
  recipientName,
  cardValue,
  brandName,
  variant = "ghost",
  size = "sm",
  showIcon = true,
  showText = true,
  onRevoked,
}: RevokeGiftCardButtonProps) {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const { mutate: revokeGiftCard, isPending } = useRevokeGiftCard();

  // Only render for admin users
  if (!hasRole('admin')) {
    return null;
  }

  const handleRevoke = () => {
    if (reason.trim().length < 10) {
      return;
    }

    revokeGiftCard(
      { assignmentId, reason: reason.trim() },
      {
        onSuccess: () => {
          setOpen(false);
          setReason("");
          onRevoked?.();
        },
      }
    );
  };

  const isReasonValid = reason.trim().length >= 10;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant={variant} 
          size={size}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          {showIcon && <Undo2 className="h-4 w-4" />}
          {showText && <span className={showIcon ? "ml-1" : ""}>Revoke</span>}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke Gift Card</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Are you sure you want to revoke this gift card? This action cannot be undone.
              </p>
              {(recipientName || cardValue || brandName) && (
                <div className="bg-muted p-3 rounded-md text-sm">
                  {recipientName && (
                    <p><strong>Recipient:</strong> {recipientName}</p>
                  )}
                  {brandName && cardValue && (
                    <p><strong>Card:</strong> ${cardValue} {brandName}</p>
                  )}
                  {cardValue && !brandName && (
                    <p><strong>Value:</strong> ${cardValue}</p>
                  )}
                </div>
              )}
              <p className="text-amber-600 font-medium">
                The card will be returned to inventory if applicable.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="reason" className="text-sm font-medium">
            Reason for revocation <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter the reason for revoking this gift card (min 10 characters)..."
            className="min-h-[80px]"
            disabled={isPending}
          />
          <p className={`text-xs ${isReasonValid ? 'text-muted-foreground' : 'text-destructive'}`}>
            {reason.length}/10 characters minimum
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleRevoke();
            }}
            disabled={isPending || !isReasonValid}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Revoking...
              </>
            ) : (
              <>
                <Undo2 className="mr-2 h-4 w-4" />
                Revoke Gift Card
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
