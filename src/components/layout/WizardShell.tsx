"use client";

import { CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { WIZARD_STEPS } from "@/types/wizard.types";

interface WizardShellProps {
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onNextLabel?: string;
  isNextDisabled?: boolean;
  children: React.ReactNode;
}

export default function WizardShell({
  currentStep,
  onNext,
  onBack,
  onNextLabel = "Continue",
  isNextDisabled = false,
  children,
}: WizardShellProps) {
  const totalSteps = WIZARD_STEPS.length;
  const currentStepData = WIZARD_STEPS[currentStep - 1];
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Progress bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        {/* Mobile: simple progress bar */}
        <div className="md:hidden px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm text-gray-500">{currentStepData?.title}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Desktop: step indicators */}
        <div className="hidden md:block px-6 py-4">
          <div className="flex items-center justify-between">
            {WIZARD_STEPS.map((step, index) => {
              const isCompleted = currentStep > step.number;
              const isCurrent = currentStep === step.number;
              const isFuture = currentStep < step.number;

              return (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200",
                        isCompleted && "bg-green-600 text-white",
                        isCurrent && "bg-green-600 text-white ring-2 ring-green-300 ring-offset-1",
                        isFuture && "bg-gray-200 text-gray-500"
                      )}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <span>{step.number}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1 font-medium text-center max-w-[60px] leading-tight",
                        isCurrent && "text-green-700",
                        isCompleted && "text-green-600",
                        isFuture && "text-gray-400"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < WIZARD_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 flex-1 mx-1 mb-4 transition-all duration-200",
                        currentStep > step.number ? "bg-green-600" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step heading */}
      <div className="bg-white border-b border-gray-100 px-4 md:px-6 py-4">
        <h2 className="text-lg md:text-xl font-semibold text-gray-900">
          Step {currentStep} of {totalSteps}:{" "}
          <span className="text-green-700">{currentStepData?.title}</span>
        </h2>
        {currentStepData?.description && (
          <p className="text-sm text-gray-500 mt-0.5">{currentStepData.description}</p>
        )}
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 md:px-6 py-6">{children}</div>

      {/* Navigation footer */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0 z-10 shadow-md">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={onBack}
                className="flex items-center gap-2 text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
          </div>
          <Button
            onClick={onNext}
            disabled={isNextDisabled}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed px-6"
          >
            {onNextLabel}
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
