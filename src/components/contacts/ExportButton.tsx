import { useState } from 'react';
import { Download, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useContactExport, ExportOptions } from '@/hooks/useContactExport';
import type { Contact } from '@/types/contacts';
import { toast } from 'sonner';

interface ExportButtonProps {
  contacts: Contact[];
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  label?: string;
  disabled?: boolean;
}

export function ExportButton({
  contacts,
  variant = 'outline',
  size = 'default',
  label,
  disabled,
}: ExportButtonProps) {
  const { exportContacts, isExporting } = useContactExport();
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = async (options: ExportOptions) => {
    if (contacts.length === 0) {
      toast.error('No contacts to export');
      return;
    }

    await exportContacts(contacts, options);
    setIsOpen(false);
  };

  const displayLabel = label || (size === 'icon' ? '' : 'Export');

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting || contacts.length === 0}
        >
          {isExporting ? (
            <>
              <FileDown className="h-4 w-4 animate-bounce mr-2" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {displayLabel}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          Export Options ({contacts.length} contact{contacts.length !== 1 ? 's' : ''})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => handleExport({ format: 'csv' })}>
          <FileDown className="h-4 w-4 mr-2" />
          Export All Fields (CSV)
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() =>
            handleExport({
              format: 'csv',
              includeFields: [
                'customer_code',
                'first_name',
                'last_name',
                'email',
                'phone',
              ],
            })
          }
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export Basic Info Only
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() =>
            handleExport({
              format: 'csv',
              includeFields: [
                'customer_code',
                'first_name',
                'last_name',
                'email',
                'phone',
                'address',
                'address2',
                'city',
                'state',
                'zip',
              ],
            })
          }
        >
          <FileDown className="h-4 w-4 mr-2" />
          Export for Direct Mail
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => handleExport({ format: 'json' })}>
          <FileDown className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

