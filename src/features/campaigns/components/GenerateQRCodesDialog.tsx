import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from '@core/services/supabase';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Progress } from "@/shared/components/ui/progress";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ExternalLink, QrCode } from "lucide-react";
import { toast } from "sonner";

interface GenerateQRCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
}

interface SampleQR {
  recipient_id: string;
  qr_url: string;
  purl: string;
}

export function GenerateQRCodesDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
}: GenerateQRCodesDialogProps) {
  const queryClient = useQueryClient();
  const [sampleQRs, setSampleQRs] = useState<SampleQR[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [audienceId, setAudienceId] = useState<string | null>(null);

  // Fetch campaign audience
  useEffect(() => {
    if (open && campaignId) {
      supabase
        .from('campaigns')
        .select('audience_id')
        .eq('id', campaignId)
        .single()
        .then(({ data }) => {
          if (data?.audience_id) {
            setAudienceId(data.audience_id);
          }
        });
    }
  }, [open, campaignId]);

  // Pre-check recipient count
  const { data: recipientCheck } = useQuery({
    queryKey: ['recipient-count', audienceId],
    queryFn: async () => {
      if (!audienceId) return null;
      
      const { count, error } = await supabase
        .from('recipients')
        .select('*', { count: 'exact', head: true })
        .eq('audience_id', audienceId);
      
      if (error) throw error;
      return count;
    },
    enabled: open && !!audienceId,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        'generate-recipient-tokens',
        {
          body: { campaign_id: campaignId },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setSampleQRs(data.sampleQRs || []);
      setTotalCount(data.total);
      setSuccessCount(data.successCount);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success(`Generated ${data.successCount} QR codes successfully`);
    },
    onError: (error) => {
      toast.error(`Failed to generate QR codes: ${error.message}`);
    },
  });

  const handleGenerate = () => {
    setSampleQRs([]);
    setTotalCount(0);
    setSuccessCount(0);
    generateMutation.mutate();
  };

  const handleClose = () => {
    setSampleQRs([]);
    setTotalCount(0);
    setSuccessCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Generate QR Codes</DialogTitle>
          <DialogDescription>
            Generate unique QR codes and PURLs for all recipients in{" "}
            <span className="font-medium">{campaignName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!generateMutation.isPending && !generateMutation.isSuccess && (
            <Card className={recipientCheck === 0 ? "border-destructive" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <QrCode className={`h-8 w-8 ${recipientCheck === 0 ? 'text-destructive' : 'text-primary'}`} />
                  <div className="flex-1">
                    {recipientCheck === 0 ? (
                      <>
                        <p className="text-sm font-medium text-destructive">No Recipients Found</p>
                        <p className="text-xs text-muted-foreground">
                          This campaign's audience has no recipient records. Please upload recipients before generating QR codes.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium">Ready to Generate</p>
                        <p className="text-xs text-muted-foreground">
                          {recipientCheck !== null && `${recipientCheck} recipients ready. `}
                          Each will receive a unique PURL and QR code for tracking.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {generateMutation.isPending && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Generating QR codes...</span>
                <span className="font-medium">Processing</span>
              </div>
              <Progress value={undefined} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                This may take a few moments depending on audience size
              </p>
            </div>
          )}

          {generateMutation.isSuccess && (
            <div className="space-y-4">
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">
                        Generation Complete
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-500">
                        Successfully generated {successCount} of {totalCount} QR codes
                      </p>
                    </div>
                    <QrCode className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                </CardContent>
              </Card>

              {sampleQRs.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Sample QR Codes</h4>
                  <div className="grid grid-cols-5 gap-3">
                    {sampleQRs.map((sample) => (
                      <div
                        key={sample.recipient_id}
                        className="space-y-1 group relative"
                      >
                        <div className="aspect-square rounded-lg border bg-white p-2">
                          <img
                            src={sample.qr_url}
                            alt="QR Code"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <a
                          href={sample.purl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 truncate"
                        >
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">View PURL</span>
                        </a>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Preview of first {sampleQRs.length} recipient QR codes
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            {!generateMutation.isSuccess && (
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || recipientCheck === 0}
              >
                {generateMutation.isPending ? "Generating..." : "Generate QR Codes"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}