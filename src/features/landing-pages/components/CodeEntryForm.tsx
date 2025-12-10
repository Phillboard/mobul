import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Alert, AlertDescription } from "@/shared/components/ui/alert";
import { Loader2, Gift } from "lucide-react";
import { supabase } from '@core/services/supabase';
import { useToast } from '@shared/hooks';

interface CodeEntryFormProps {
  campaignId: string;
}

export function CodeEntryForm({ campaignId }: CodeEntryFormProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const validateMutation = useMutation({
    mutationFn: async (enteredCode: string) => {
      const { data, error } = await supabase.functions.invoke("validate-gift-card-code", {
        body: { code: enteredCode, campaignId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.valid) {
        navigate(`/redeem/${campaignId}/${data.redemptionToken}`);
      } else {
        setError(data.message || "Invalid code. Please check and try again.");
      }
    },
    onError: (error: Error) => {
      setError(error.message || "Something went wrong. Please try again.");
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (code.length < 6) {
      setError("Code must be at least 6 characters");
      return;
    }

    validateMutation.mutate(code);
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Gift className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Enter Your Code</CardTitle>
        <CardDescription>
          Please enter the unique code from your postcard to claim your gift card
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setError("");
              }}
              placeholder="Enter code"
              maxLength={20}
              className="text-center text-2xl tracking-widest font-mono"
              disabled={validateMutation.isPending}
            />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={code.length < 6 || validateMutation.isPending}
          >
            {validateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Validating...
              </>
            ) : (
              "Claim Gift Card"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
