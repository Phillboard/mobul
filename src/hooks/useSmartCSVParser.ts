import { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { UniqueCodeService } from '@/lib/services/uniqueCodeService';

export interface ParsedCSVData {
  headers: string[];
  rows: Record<string, any>[];
  detectedCodeColumn: string | null;
  suggestions: Map<string, number>;
  stats: {
    totalRows: number;
    hasCodeColumn: boolean;
    emptyCodeCount: number;
    duplicateCodeCount: number;
  };
}

export interface ParseOptions {
  skipEmptyLines?: boolean;
  trimHeaders?: boolean;
  maxRows?: number;
}

export function useSmartCSVParser() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseFile = useCallback(async (
    file: File,
    options: ParseOptions = {}
  ): Promise<ParsedCSVData | null> => {
    setIsProcessing(true);
    setError(null);

    try {
      return await new Promise((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: options.skipEmptyLines ?? true,
          transformHeader: options.trimHeaders ? (header: string) => header.trim() : undefined,
          complete: (results) => {
            try {
              const headers = results.meta.fields || [];
              let rows = results.data as Record<string, any>[];

              // Limit rows if maxRows specified
              if (options.maxRows && rows.length > options.maxRows) {
                rows = rows.slice(0, options.maxRows);
              }

              // Detect code column
              const detectedCodeColumn = UniqueCodeService.detectCodeColumn(headers);

              // Get column suggestions
              const suggestions = UniqueCodeService.getColumnSuggestions(headers);

              // Calculate stats
              const codeColumnValues = detectedCodeColumn 
                ? rows.map(row => row[detectedCodeColumn])
                : [];

              const emptyCodeCount = codeColumnValues.filter(v => !v || v.trim() === '').length;
              const duplicates = UniqueCodeService.findDuplicates(
                codeColumnValues.filter(v => v && v.trim())
              );

              const parsedData: ParsedCSVData = {
                headers,
                rows,
                detectedCodeColumn,
                suggestions,
                stats: {
                  totalRows: rows.length,
                  hasCodeColumn: detectedCodeColumn !== null,
                  emptyCodeCount,
                  duplicateCodeCount: duplicates.size,
                },
              };

              resolve(parsedData);
            } catch (err) {
              reject(err);
            }
          },
          error: (error) => {
            reject(new Error(`CSV parsing error: ${error.message}`));
          },
        });
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error parsing CSV';
      setError(errorMessage);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    parseFile,
    isProcessing,
    error,
  };
}

