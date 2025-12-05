import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertCircle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ImportError {
  row: number;
  field: string;
  message: string;
}

interface ImportResultsProps {
  audienceId: string;
  audienceName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: ImportError[];
  onViewAudience: () => void;
}

export function ImportResults({
  audienceId,
  audienceName,
  totalRows,
  validRows,
  invalidRows,
  errors,
  onViewAudience
}: ImportResultsProps) {
  return (
    <Card className="border-success/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          Import Completed
        </CardTitle>
        <CardDescription>
          Your audience "{audienceName}" has been imported successfully
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold">{totalRows}</div>
            <div className="text-sm text-muted-foreground">Total Rows</div>
          </div>
          <div className="rounded-lg border border-success/20 bg-success/5 p-4 text-center">
            <div className="text-2xl font-bold text-success">{validRows}</div>
            <div className="text-sm text-muted-foreground">Valid Addresses</div>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
            <div className="text-2xl font-bold text-destructive">{invalidRows}</div>
            <div className="text-sm text-muted-foreground">Invalid</div>
          </div>
        </div>

        {/* Error Details */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Validation Errors</span>
              <Badge variant="destructive">{errors.length}</Badge>
            </div>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left">Row</th>
                    <th className="px-4 py-2 text-left">Field</th>
                    <th className="px-4 py-2 text-left">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.map((error, idx) => (
                    <tr key={idx} className="border-b border-border last:border-0">
                      <td className="px-4 py-2">{error.row}</td>
                      <td className="px-4 py-2">
                        <Badge variant="outline">{error.field}</Badge>
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{error.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {errors.length >= 100 && (
              <p className="text-xs text-muted-foreground">
                Showing first 100 errors only
              </p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button onClick={onViewAudience} className="flex-1">
            <Eye className="mr-2 h-4 w-4" />
            View Audience
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
