import { Button } from "@/components/ui/button";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

interface ExportButtonProps {
  data: any[];
  filename: string;
  headers?: string[];
}

export function ExportButton({ data, filename, headers }: ExportButtonProps) {
  const exportToCSV = () => {
    try {
      if (!data || data.length === 0) {
        toast({
          title: "No data to export",
          description: "There is no data available to export.",
          variant: "destructive",
        });
        return;
      }

      // Get headers from data keys if not provided
      const csvHeaders = headers || Object.keys(data[0]);
      
      // Create CSV content
      const csvRows = [
        csvHeaders.join(","),
        ...data.map(row =>
          csvHeaders
            .map(header => {
              const value = row[header];
              // Handle values that might contain commas
              if (typeof value === "string" && value.includes(",")) {
                return `"${value}"`;
              }
              return value ?? "";
            })
            .join(",")
        ),
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${data.length} records to CSV`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting data",
        variant: "destructive",
      });
    }
  };

  const exportToJSON = () => {
    try {
      if (!data || data.length === 0) {
        toast({
          title: "No data to export",
          description: "There is no data available to export.",
          variant: "destructive",
        });
        return;
      }

      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${filename}.json`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Exported ${data.length} records to JSON`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: "An error occurred while exporting data",
        variant: "destructive",
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileText className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
