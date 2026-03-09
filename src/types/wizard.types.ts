import {
  CalculatorStepData,
  FactFindStepData,
  NeedsAnalysisStepData,
  ProductSelectionStepData,
  ConfigurationStepData,
  ROAStepData,
  AcceptanceStepData,
} from "./application.types";
import { DisclosureStepData } from "./disclosure.types";

export interface WizardStep {
  number: number;
  title: string;
  description: string;
  path: string;
}

export const WIZARD_STEPS: WizardStep[] = [
  { number: 1, title: "Funeral Costs", description: "Estimate funeral expenses", path: "/wizard/step/1" },
  { number: 2, title: "Your Details", description: "Personal & financial information", path: "/wizard/step/2" },
  { number: 3, title: "Needs Analysis", description: "Cover gap analysis", path: "/wizard/step/3" },
  { number: 4, title: "Products", description: "Choose your cover", path: "/wizard/step/4" },
  { number: 5, title: "Configure", description: "Customise your policy", path: "/wizard/step/5" },
  { number: 6, title: "Disclosures", description: "Important information", path: "/wizard/step/6" },
  { number: 7, title: "Record of Advice", description: "Your advice summary", path: "/wizard/step/7" },
  { number: 8, title: "Accept", description: "Sign & confirm", path: "/wizard/step/8" },
  { number: 9, title: "Complete", description: "Application submitted", path: "/wizard/step/9" },
];

export interface WizardState {
  currentStep: number;
  completedSteps: number[];
  applicationId: string | null;
  clientId: string | null;

  step1?: CalculatorStepData;
  step2?: FactFindStepData;
  step3?: NeedsAnalysisStepData;
  step4?: ProductSelectionStepData;
  step5?: ConfigurationStepData;
  step6?: DisclosureStepData;
  step7?: ROAStepData;
  step8?: AcceptanceStepData;
}
