import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, AlertTriangle, Play, Download } from "lucide-react";
import { MVPVerification, VerificationResult } from '@/lib/system/mvp-verification";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MVPDataSeeder } from "@/components/admin/MVPDataSeeder";

export default function MVPVerification() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<VerificationResult[] | null>(null);
  const [resultsByCategory, setResultsByCategory] = useState<Record<string, VerificationResult[]> | null>(null);

  const runVerification = async () => {
    setIsRunning(true);
    setResults(null);
    setResultsByCategory(null);

    try {
      const verification = new MVPVerification();
      const verificationResults = await verification.runAll();
      setResults(verificationResults);
      setResultsByCategory(verification.getResultsByCategory());
    } catch (error) {
      console.error("Verification failed:", error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      pass: "default",
      fail: "destructive",
      warning: "secondary",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const getSummary = () => {
    if (!results) return null;

    const passed = results.filter((r) => r.status === "pass").length;
    const failed = results.filter((r) => r.status === "fail").length;
    const warnings = results.filter((r) => r.status === "warning").length;

    return { passed, failed, warnings, total: results.length };
  };

  const downloadResults = () => {
    if (!results) return;

    const data = JSON.stringify(results, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mvp-verification-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const summary = getSummary();

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">MVP Verification</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive check to ensure all components are ready for running campaigns
          </p>
        </div>

        <Tabs defaultValue="verify" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="verify">Verification</TabsTrigger>
            <TabsTrigger value="seed">Seed Test Data</TabsTrigger>
          </TabsList>

          <TabsContent value="verify" className="space-y-6 mt-6">
            <Card>
          <CardHeader>
            <CardTitle>System Readiness Check</CardTitle>
            <CardDescription>
              Verify database tables, test data, environment configuration, and edge functions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Button onClick={runVerification} disabled={isRunning} size="lg">
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Verification...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Verification
                  </>
                )}
              </Button>

              {results && (
                <Button onClick={downloadResults} variant="outline" size="lg">
                  <Download className="mr-2 h-4 w-4" />
                  Export Results
                </Button>
              )}
            </div>

            {summary && (
              <Alert className="mt-4">
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-semibold text-lg">Summary</div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Total Checks</div>
                        <div className="text-2xl font-bold">{summary.total}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Passed</div>
                        <div className="text-2xl font-bold text-green-600">{summary.passed}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Failed</div>
                        <div className="text-2xl font-bold text-red-600">{summary.failed}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Warnings</div>
                        <div className="text-2xl font-bold text-yellow-600">{summary.warnings}</div>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      {summary.failed === 0 && summary.warnings === 0 ? (
                        <div className="text-green-600 font-semibold flex items-center gap-2">
                          <CheckCircle className="h-5 w-5" />
                          🎉 MVP IS READY! You can create and run campaigns.
                        </div>
                      ) : summary.failed === 0 ? (
                        <div className="text-yellow-600 font-semibold flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5" />
                          MVP is mostly ready but has some warnings. Review below.
                        </div>
                      ) : (
                        <div className="text-red-600 font-semibold flex items-center gap-2">
                          <XCircle className="h-5 w-5" />
                          MVP NOT READY. Please fix the failed checks below.
                        </div>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {resultsByCategory && (
          <Card>
            <CardHeader>
              <CardTitle>Detailed Results</CardTitle>
              <CardDescription>Verification results grouped by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <Accordion type="multiple" className="w-full">
                  {Object.entries(resultsByCategory).map(([category, categoryResults]) => {
                    const failed = categoryResults.filter((r) => r.status === "fail").length;
                    const warnings = categoryResults.filter((r) => r.status === "warning").length;
                    const passed = categoryResults.filter((r) => r.status === "pass").length;

                    return (
                      <AccordionItem key={category} value={category}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="font-semibold">{category}</span>
                            <div className="flex gap-2">
                              {passed > 0 && (
                                <Badge variant="default" className="bg-green-600">
                                  {passed} passed
                                </Badge>
                              )}
                              {warnings > 0 && (
                                <Badge variant="secondary" className="bg-yellow-600 text-white">
                                  {warnings} warnings
                                </Badge>
                              )}
                              {failed > 0 && (
                                <Badge variant="destructive">
                                  {failed} failed
                                </Badge>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3 pt-2">
                            {categoryResults.map((result, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                              >
                                <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{result.check}</span>
                                    {getStatusBadge(result.status)}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {result.message}
                                  </p>
                                  {result.data && (
                                    <details className="mt-2">
                                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                                        View Data
                                      </summary>
                                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                                        {JSON.stringify(result.data, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Next Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">If you see warnings or failures:</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Run the seed script: Execute <code className="bg-muted px-1 rounded">seed-mvp-test-data.sql</code> in your Supabase SQL editor</li>
                  <li>Configure environment variables in your <code className="bg-muted px-1 rounded">.env</code> file</li>
                  <li>Check that Supabase Edge Functions are deployed</li>
                  <li>Verify Twilio credentials for SMS functionality</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Once all checks pass:</h4>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  <li>Create your first campaign through the wizard</li>
                  <li>Test the full flow: Campaign → Condition → Gift Card → SMS</li>
                  <li>Visit the PURL page to verify recipient experience</li>
                </ul>
              </div>
            </div>
          </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="seed" className="space-y-6 mt-6">
            <MVPDataSeeder />

            <Card>
              <CardHeader>
                <CardTitle>After Seeding</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  After seeding test data, switch to the <strong>Verification</strong> tab and run the verification to ensure everything was created successfully.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

