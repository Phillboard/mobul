import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function SampleCSVDownload() {
  const downloadSampleCSV = () => {
    const sampleData = [
      ['first_name', 'last_name', 'company', 'address1', 'address2', 'city', 'state', 'zip', 'email', 'phone'],
      ['John', 'Doe', 'ABC Roofing', '123 Main St', 'Suite 100', 'Austin', 'TX', '78701', 'john@example.com', '512-555-0100'],
      ['Jane', 'Smith', 'XYZ Properties', '456 Oak Ave', '', 'Houston', 'TX', '77002', 'jane@example.com', '713-555-0200'],
      ['Bob', 'Johnson', '', '789 Pine Rd', 'Apt 5', 'Dallas', 'TX', '75201', '', '214-555-0300'],
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-audience-import.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={downloadSampleCSV}
      className="w-full"
    >
      <Download className="mr-2 h-4 w-4" />
      Download Sample CSV
    </Button>
  );
}
