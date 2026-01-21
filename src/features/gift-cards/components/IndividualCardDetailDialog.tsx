/**
 * IndividualCardDetailDialog - Detailed view for a single gift card
 * 
 * Features:
 * - Full card information display
 * - Balance history timeline
 * - Manual balance update
 * - Delete functionality
 * - Notes management
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Separator } from "@/shared/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Eye,
  EyeOff,
  RefreshCw,
  Trash2,
  DollarSign,
  Calendar,
  User,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Loader2,
  Save,
  History,
  FileText,
} from "lucide-react";
import { formatCurrency } from '@shared/utils/currencyUtils';
import { formatDate, DATE_FORMATS } from '@shared/utils/date';
import {
  useCardDetail,
  useCardBalanceHistory,
  useDeleteCard,
  useCheckCardBalance,
  useUpdateCardBalance,
  useUpdateCardNotes,
} from '@/features/gift-cards/hooks';

interface IndividualCardDetailDialogProps {
  cardId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
    available: { variant: "default", label: "Available" },
    assigned: { variant: "secondary", label: "Assigned" },
    delivered: { variant: "outline", label: "Delivered" },
    expired: { variant: "destructive", label: "Expired" },
  };
  const config = variants[status] || variants.available;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function BalanceCheckStatusIcon({ status }: { status: string | null }) {
  switch (status) {
    case "success":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "error":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "manual":
      return <User className="h-4 w-4 text-blue-500" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
}

export function IndividualCardDetailDialog({
  cardId,
  open,
  onOpenChange,
}: IndividualCardDetailDialogProps) {
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [manualBalance, setManualBalance] = useState("");
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Data fetching
  const { data: card, isLoading: cardLoading } = useCardDetail(cardId);
  const { data: balanceHistory, isLoading: historyLoading } = useCardBalanceHistory(cardId);

  // Mutations
  const deleteCard = useDeleteCard();
  const checkBalance = useCheckCardBalance();
  const updateBalance = useUpdateCardBalance();
  const updateNotes = useUpdateCardNotes();

  // Initialize notes when card data loads
  if (card && notes === "" && !isEditingNotes) {
    setNotes(card.notes || "");
  }

  const handleCheckBalance = async () => {
    if (cardId) {
      await checkBalance.mutateAsync(cardId);
    }
  };

  const handleManualBalanceUpdate = async () => {
    if (cardId && manualBalance) {
      const balance = parseFloat(manualBalance);
      if (!isNaN(balance) && balance >= 0) {
        await updateBalance.mutateAsync({ cardId, balance });
        setManualBalance("");
      }
    }
  };

  const handleSaveNotes = async () => {
    if (cardId) {
      await updateNotes.mutateAsync({ cardId, notes });
      setIsEditingNotes(false);
    }
  };

  const handleDelete = async () => {
    if (cardId) {
      await deleteCard.mutateAsync({ cardId });
      setDeleteConfirmOpen(false);
      onOpenChange(false);
    }
  };

  const maskCode = (code: string) => {
    if (!code || code.length < 4) return code;
    return code.slice(0, 4) + "****" + code.slice(-4);
  };

  if (cardLoading || !card) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {card.gift_card_brands?.logo_url && (
                <img
                  src={card.gift_card_brands.logo_url}
                  alt={card.gift_card_brands.brand_name}
                  className="h-8 w-auto object-contain"
                />
              )}
              <div>
                <span className="text-lg">
                  {card.gift_card_brands?.brand_name || "Unknown Brand"}
                </span>
                <span className="text-muted-foreground ml-2">
                  {formatCurrency(card.denomination)}
                </span>
              </div>
              <StatusBadge status={card.status} />
            </DialogTitle>
            <DialogDescription>
              Card ID: {card.id}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">
                <Package className="h-4 w-4 mr-2" />
                Details
              </TabsTrigger>
              <TabsTrigger value="balance">
                <DollarSign className="h-4 w-4 mr-2" />
                Balance
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Details Tab */}
            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Card Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Card Code */}
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Card Code</Label>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted px-3 py-1 rounded font-mono text-sm">
                        {codeRevealed ? card.card_code : maskCode(card.card_code)}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCodeRevealed(!codeRevealed)}
                      >
                        {codeRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Card Number */}
                  {card.card_number && (
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Card Number</Label>
                      <code className="bg-muted px-3 py-1 rounded font-mono text-sm">
                        {card.card_number}
                      </code>
                    </div>
                  )}

                  <Separator />

                  {/* Status & Value */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <StatusBadge status={card.status} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Face Value</Label>
                      <div className="mt-1 text-lg font-semibold">
                        {formatCurrency(card.denomination)}
                      </div>
                    </div>
                  </div>

                  {/* Expiration */}
                  {card.expiration_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Expires:</span>
                      <span className={`text-sm ${new Date(card.expiration_date) < new Date() ? "text-red-500" : ""}`}>
                        {formatDate(card.expiration_date, DATE_FORMATS.LONG)}
                      </span>
                    </div>
                  )}

                  {/* Balance Check URL */}
                  {card.gift_card_brands?.balance_check_url && (
                    <div className="flex items-center gap-2">
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Check balance:</span>
                      <a
                        href={card.gift_card_brands.balance_check_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-500 hover:underline"
                      >
                        {card.gift_card_brands.balance_check_url}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Assignment Info */}
              {(card.assigned_to_recipient_id || card.assigned_to_campaign_id) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-muted-foreground">Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {card.recipients && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Assigned to: {card.recipients.first_name} {card.recipients.last_name}
                          {card.recipients.email && ` (${card.recipients.email})`}
                        </span>
                      </div>
                    )}
                    {card.campaigns && (
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Campaign: {card.campaigns.name}</span>
                      </div>
                    )}
                    {card.assigned_at && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Assigned: {formatDate(card.assigned_at, DATE_FORMATS.LONG)}
                        </span>
                      </div>
                    )}
                    {card.delivered_at && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-muted-foreground">
                          Delivered: {formatDate(card.delivered_at, DATE_FORMATS.LONG)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Notes
                    </CardTitle>
                    {!isEditingNotes && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingNotes(true)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingNotes ? (
                    <div className="space-y-2">
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Add notes about this card..."
                        rows={3}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setNotes(card.notes || "");
                            setIsEditingNotes(false);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveNotes}
                          disabled={updateNotes.isPending}
                        >
                          {updateNotes.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {card.notes || "No notes"}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Balance Tab */}
            <TabsContent value="balance" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Current Balance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <BalanceCheckStatusIcon status={card.balance_check_status} />
                        <span className="text-3xl font-bold">
                          {card.current_balance !== null
                            ? formatCurrency(card.current_balance)
                            : "Unknown"}
                        </span>
                      </div>
                      {card.last_balance_check && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Last checked: {formatDate(card.last_balance_check, DATE_FORMATS.RELATIVE)}
                        </p>
                      )}
                      {card.balance_check_error && (
                        <p className="text-sm text-red-500 mt-1">
                          Error: {card.balance_check_error}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleCheckBalance}
                      disabled={checkBalance.isPending}
                    >
                      {checkBalance.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Check Balance
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Manual Balance Update */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Manual Balance Entry</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={manualBalance}
                        onChange={(e) => setManualBalance(e.target.value)}
                        className="pl-7"
                      />
                    </div>
                    <Button
                      onClick={handleManualBalanceUpdate}
                      disabled={!manualBalance || updateBalance.isPending}
                    >
                      {updateBalance.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Update
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Use this to manually set the card balance when automatic checking isn't available.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Balance Check History</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : balanceHistory && balanceHistory.length > 0 ? (
                    <div className="space-y-3">
                      {balanceHistory.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <BalanceCheckStatusIcon status={entry.check_status} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {entry.new_balance !== null
                                  ? formatCurrency(entry.new_balance)
                                  : "Check failed"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(entry.checked_at, DATE_FORMATS.LONG)}
                              </span>
                            </div>
                            {entry.change_amount !== null && entry.change_amount !== 0 && (
                              <span
                                className={`text-sm ${
                                  entry.change_amount < 0 ? "text-red-500" : "text-green-500"
                                }`}
                              >
                                {entry.change_amount > 0 ? "+" : ""}
                                {formatCurrency(entry.change_amount)}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {entry.check_method}
                              </Badge>
                              {entry.error_message && (
                                <span className="text-xs text-red-500">
                                  {entry.error_message}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No balance history available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upload Info */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground">Upload Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {card.uploaded_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Uploaded:</span>
                      <span>{formatDate(card.uploaded_at, DATE_FORMATS.LONG)}</span>
                    </div>
                  )}
                  {card.upload_batch_id && (
                    <div className="flex items-center gap-2 text-sm">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Batch ID:</span>
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {card.upload_batch_id}
                      </code>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex items-center justify-between mt-6 pt-4 border-t">
            <Button
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={card.status === "assigned" || card.status === "delivered"}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Card
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Gift Card?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The gift card and all its balance history will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteCard.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

