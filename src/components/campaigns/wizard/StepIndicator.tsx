import { Check } from "lucide-react";
import { cn } from '@/lib/utils/utils';

interface StepIndicatorProps {
  currentStep: number;
  steps: { label: string; description: string }[];
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ currentStep, steps, onStepClick }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-between w-full mb-8">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        // Fix: Use index directly instead of stepNumber for comparison
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isUpcoming = index > currentStep;
        const isClickable = (isCompleted || isCurrent) && onStepClick;

        return (
          <div key={index} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <button
                type="button"
                onClick={() => isClickable && onStepClick(index)}
                disabled={!isClickable}
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  isUpcoming && "bg-muted text-muted-foreground",
                  isClickable && "cursor-pointer hover:ring-4 hover:ring-primary/10",
                  !isClickable && "cursor-not-allowed"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span>{stepNumber}</span>
                )}
              </button>
              <div className="mt-2 text-center">
                <div
                  className={cn(
                    "text-sm font-medium",
                    isCurrent && "text-foreground",
                    !isCurrent && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </div>
                <div className="text-xs text-muted-foreground hidden sm:block">
                  {step.description}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-[2px] flex-1 mx-2 transition-all",
                  isCompleted ? "bg-primary" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
