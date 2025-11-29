/**
 * MailingMethodStep - FIRST step in campaign wizard
 * 
 * Per Mike's requirements: Most clients mail themselves.
 * "I already have my own design" should be the clear default.
 * 
 * Self-mailers: upload codes, set conditions, pick page/form - that's it
 * ACE fulfillment: full wizard with design, delivery, etc.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Truck, Check, Mail, ArrowRight } from "lucide-react";
import { cn } from '@/lib/utils/utils';

export type MailingMethod = 'self' | 'ace_fulfillment';

interface MailingMethodStepProps {
  selectedMethod: MailingMethod | null;
  onSelect: (method: MailingMethod) => void;
  onNext: () => void;
  onCancel: () => void;
  onSaveDraft?: () => void;
}

export function MailingMethodStep({ selectedMethod, onSelect, onNext, onCancel, onSaveDraft }: MailingMethodStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-2">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Are you mailing yourself?</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Most clients handle their own mail and just need our code validation & gift card system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
        {/* PRIMARY OPTION - Self Mailer (Most Common) */}
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:border-primary hover:shadow-md",
            selectedMethod === 'self' && "border-primary ring-2 ring-primary bg-primary/5",
            "relative"
          )}
          onClick={() => onSelect('self')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                selectedMethod === 'self' ? "bg-primary text-primary-foreground" : "bg-primary/10"
              )}>
                <Upload className={cn("h-6 w-6", selectedMethod === 'self' ? "" : "text-primary")} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg">I'm mailing myself</CardTitle>
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    Most Common
                  </span>
                </div>
                <CardDescription className="text-base mt-1">
                  I already have my own designs and mail house
                </CardDescription>
              </div>
              {selectedMethod === 'self' && (
                <Check className="h-6 w-6 text-primary flex-shrink-0" />
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 pl-20">
            <p className="text-sm text-muted-foreground">
              You'll upload your unique codes, set up conditions, and we'll handle 
              the code validation and gift card delivery.
            </p>
          </CardContent>
        </Card>

        {/* SECONDARY OPTION - ACE Fulfillment */}
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:border-muted-foreground/50 hover:shadow-sm",
            selectedMethod === 'ace_fulfillment' && "border-primary ring-2 ring-primary bg-primary/5"
          )}
          onClick={() => onSelect('ace_fulfillment')}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start gap-4">
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
                selectedMethod === 'ace_fulfillment' ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                <Truck className={cn("h-6 w-6", selectedMethod === 'ace_fulfillment' ? "" : "text-muted-foreground")} />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg">ACE handles mailing</CardTitle>
                <CardDescription className="text-base mt-1">
                  I want ACE to design, print, and send mail for me
                </CardDescription>
              </div>
              {selectedMethod === 'ace_fulfillment' && (
                <Check className="h-6 w-6 text-primary flex-shrink-0" />
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0 pl-20">
            <p className="text-sm text-muted-foreground">
              Full service: design your mail piece, select audience, and we 
              handle printing and delivery.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between gap-2 pt-4 max-w-2xl mx-auto">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <div className="flex gap-2">
          {onSaveDraft && (
            <Button type="button" variant="ghost" onClick={onSaveDraft}>
              Save Draft
            </Button>
          )}
          <Button onClick={onNext} disabled={!selectedMethod} size="lg">
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
