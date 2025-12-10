import { Progress } from "@/shared/components/ui/progress";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from '@shared/utils/cn';
import { Check, Circle } from "lucide-react";

interface Step {
  id: number;
  label: string;
  description: string;
  status: 'complete' | 'current' | 'upcoming';
}

interface WizardProgressIndicatorProps {
  steps: Array<{ label: string; description: string }>;
  currentStep: number;
  className?: string;
}

export function WizardProgressIndicator({
  steps,
  currentStep,
  className,
}: WizardProgressIndicatorProps) {
  const stepsWithStatus: Step[] = steps.map((step, index) => ({
    id: index,
    ...step,
    status: index < currentStep ? 'complete' : index === currentStep ? 'current' : 'upcoming',
  }));

  const progressPercentage = ((currentStep) / (steps.length - 1)) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>{Math.round(progressPercentage)}% Complete</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-between relative">
        {/* Connection Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border -z-10" />
        
        {stepsWithStatus.map((step, index) => (
          <div
            key={step.id}
            className="flex flex-col items-center gap-2 relative bg-background px-2"
          >
            {/* Circle Indicator */}
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                step.status === 'complete' && "bg-primary border-primary text-primary-foreground",
                step.status === 'current' && "bg-primary/10 border-primary text-primary",
                step.status === 'upcoming' && "bg-background border-border text-muted-foreground"
              )}
            >
              {step.status === 'complete' ? (
                <Check className="h-5 w-5" />
              ) : (
                <span className="text-sm font-semibold">{index + 1}</span>
              )}
            </div>

            {/* Step Label */}
            <div className="text-center max-w-24">
              <div
                className={cn(
                  "text-xs font-medium",
                  step.status === 'current' && "text-foreground",
                  step.status !== 'current' && "text-muted-foreground"
                )}
              >
                {step.label}
              </div>
              {step.status === 'current' && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  Current
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current Step Description */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          {stepsWithStatus[currentStep]?.description}
        </p>
      </div>
    </div>
  );
}

