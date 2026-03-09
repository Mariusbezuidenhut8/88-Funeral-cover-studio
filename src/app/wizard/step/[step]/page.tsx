"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useWizardStore } from "@/lib/store/wizard.store";
import WizardShell from "@/components/layout/WizardShell";
import Step1Calculator from "@/components/wizard/Step1Calculator";
import Step2FactFind from "@/components/wizard/Step2FactFind";
import Step3NeedsAnalysis from "@/components/wizard/Step3NeedsAnalysis";
import Step4ProductSelection from "@/components/wizard/Step4ProductSelection";
import Step5Configuration from "@/components/wizard/Step5Configuration";
import Step6Disclosures from "@/components/wizard/Step6Disclosures";
import Step7RecordOfAdvice from "@/components/wizard/Step7RecordOfAdvice";
import Step8Acceptance from "@/components/wizard/Step8Acceptance";
import Step9Complete from "@/components/wizard/Step9Complete";

const TOTAL_STEPS = 9;

export default function WizardStepPage() {
  const params = useParams();
  const router = useRouter();
  const { completedSteps, setCurrentStep, markStepComplete } = useWizardStore();

  const stepParam = parseInt(params.step as string, 10);

  // Redirect if step is out of range
  useEffect(() => {
    if (isNaN(stepParam) || stepParam < 1 || stepParam > TOTAL_STEPS) {
      router.replace("/wizard/step/1");
      return;
    }
    // If trying to jump ahead past an incomplete step, redirect to first incomplete
    if (stepParam > 1) {
      for (let i = 1; i < stepParam; i++) {
        if (!completedSteps.includes(i)) {
          router.replace(`/wizard/step/${i}`);
          return;
        }
      }
    }
    setCurrentStep(stepParam);
  }, [stepParam, completedSteps, router, setCurrentStep]);

  if (isNaN(stepParam) || stepParam < 1 || stepParam > TOTAL_STEPS) {
    return null;
  }

  function handleNext() {
    markStepComplete(stepParam);
    if (stepParam < TOTAL_STEPS) {
      router.push(`/wizard/step/${stepParam + 1}`);
    }
  }

  function handleBack() {
    if (stepParam > 1) {
      router.push(`/wizard/step/${stepParam - 1}`);
    }
  }

  function handleStepComplete() {
    markStepComplete(stepParam);
  }

  function renderStep() {
    switch (stepParam) {
      case 1:
        return <Step1Calculator onComplete={handleStepComplete} />;
      case 2:
        return <Step2FactFind onComplete={handleStepComplete} />;
      case 3:
        return <Step3NeedsAnalysis onComplete={handleStepComplete} />;
      case 4:
        return <Step4ProductSelection onComplete={handleStepComplete} />;
      case 5:
        return <Step5Configuration onComplete={handleStepComplete} />;
      case 6:
        return <Step6Disclosures onComplete={handleStepComplete} />;
      case 7:
        return <Step7RecordOfAdvice onComplete={handleStepComplete} />;
      case 8:
        return <Step8Acceptance onComplete={handleStepComplete} />;
      case 9:
        return <Step9Complete onComplete={handleStepComplete} />;
      default:
        return null;
    }
  }

  const isLastStep = stepParam === TOTAL_STEPS;
  const nextLabel = isLastStep ? "Finish" : "Continue";

  return (
    <WizardShell
      currentStep={stepParam}
      onNext={handleNext}
      onBack={handleBack}
      onNextLabel={nextLabel}
      isNextDisabled={false}
    >
      {renderStep()}
    </WizardShell>
  );
}
