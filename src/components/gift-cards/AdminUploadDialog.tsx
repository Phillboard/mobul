import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GiftCardUploadTab } from "./GiftCardUploadTab";

interface AdminUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolId: string;
}

export function AdminUploadDialog({ open, onOpenChange, poolId }: AdminUploadDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Gift Cards to Master Pool</DialogTitle>
          <DialogDescription>
            Upload CSV file with gift card codes to add inventory to this master pool
          </DialogDescription>
        </DialogHeader>
        
        <GiftCardUploadTab 
          clientId={undefined} 
          preselectedPoolId={poolId}
        />
      </DialogContent>
    </Dialog>
  );
}