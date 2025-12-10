import { useCallback, useRef } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: Record<string, string[]>;
  maxSize?: number;
}

export function FileUploadZone({
  onFileSelect,
  accept = {
    'text/csv': ['.csv'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-excel': ['.xls'],
  },
  maxSize = 20 * 1024 * 1024, // 20MB
}: FileUploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (rejectedFiles.length > 0) {
      return;
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    acceptedFiles,
    fileRejections,
    inputRef,
  } = useDropzone({
    onDrop,
    accept,
    maxSize,
    multiple: false,
  });

  const selectedFile = acceptedFiles[0];
  const error = fileRejections[0]?.errors[0];

  const clearFile = () => {
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50 hover:bg-muted/50'
            }
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {isDragActive ? (
            <p className="text-lg font-medium">Drop the file here...</p>
          ) : (
            <>
              <p className="text-lg font-medium mb-2">
                Drag & drop a file here, or click to select
              </p>
              <p className="text-sm text-muted-foreground">
                Supports CSV, XLSX, XLS (max {maxSize / 1024 / 1024}MB)
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFile}
              type="button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>
            {error.code === 'file-too-large' && 
              `File too large. Maximum size: ${maxSize / 1024 / 1024}MB`}
            {error.code === 'file-invalid-type' && 
              'Invalid file type. Please upload CSV or Excel files.'}
            {!['file-too-large', 'file-invalid-type'].includes(error.code) && 
              error.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
