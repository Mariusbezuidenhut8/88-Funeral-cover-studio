"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CalculatorStepData,
  FactFindStepData,
  NeedsAnalysisStepData,
  ProductSelectionStepData,
  ConfigurationStepData,
  ROAStepData,
  AcceptanceStepData,
} from "@/types/application.types";
import { DisclosureStepData } from "@/types/disclosure.types";
import { WizardState } from "@/types/wizard.types";

interface WizardStore extends WizardState {
  // Actions
  setCurrentStep: (step: number) => void;
  markStepComplete: (step: number) => void;
  setApplicationId: (id: string) => void;
  setClientId: (id: string) => void;

  saveStep1: (data: CalculatorStepData) => void;
  saveStep2: (data: FactFindStepData) => void;
  saveStep3: (data: NeedsAnalysisStepData) => void;
  saveStep4: (data: ProductSelectionStepData) => void;
  saveStep5: (data: ConfigurationStepData) => void;
  saveStep6: (data: DisclosureStepData) => void;
  saveStep7: (data: ROAStepData) => void;
  saveStep8: (data: AcceptanceStepData) => void;

  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  resetWizard: () => void;
  canGoToStep: (step: number) => boolean;
}

const initialState: WizardState = {
  currentStep: 1,
  completedSteps: [],
  applicationId: null,
  clientId: null,
};

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setCurrentStep: (step) => set({ currentStep: step }),

      markStepComplete: (step) =>
        set((state) => ({
          completedSteps: state.completedSteps.includes(step)
            ? state.completedSteps
            : [...state.completedSteps, step],
        })),

      setApplicationId: (id) => set({ applicationId: id }),
      setClientId: (id) => set({ clientId: id }),

      saveStep1: (data) =>
        set((state) => ({
          step1: data,
          completedSteps: state.completedSteps.includes(1)
            ? state.completedSteps
            : [...state.completedSteps, 1],
        })),

      saveStep2: (data) =>
        set((state) => ({
          step2: data,
          completedSteps: state.completedSteps.includes(2)
            ? state.completedSteps
            : [...state.completedSteps, 2],
        })),

      saveStep3: (data) =>
        set((state) => ({
          step3: data,
          completedSteps: state.completedSteps.includes(3)
            ? state.completedSteps
            : [...state.completedSteps, 3],
        })),

      saveStep4: (data) =>
        set((state) => ({
          step4: data,
          completedSteps: state.completedSteps.includes(4)
            ? state.completedSteps
            : [...state.completedSteps, 4],
        })),

      saveStep5: (data) =>
        set((state) => ({
          step5: data,
          completedSteps: state.completedSteps.includes(5)
            ? state.completedSteps
            : [...state.completedSteps, 5],
        })),

      saveStep6: (data) =>
        set((state) => ({
          step6: data,
          completedSteps: state.completedSteps.includes(6)
            ? state.completedSteps
            : [...state.completedSteps, 6],
        })),

      saveStep7: (data) =>
        set((state) => ({
          step7: data,
          completedSteps: state.completedSteps.includes(7)
            ? state.completedSteps
            : [...state.completedSteps, 7],
        })),

      saveStep8: (data) =>
        set((state) => ({
          step8: data,
          completedSteps: state.completedSteps.includes(8)
            ? state.completedSteps
            : [...state.completedSteps, 8],
        })),

      nextStep: () =>
        set((state) => ({
          currentStep: Math.min(state.currentStep + 1, 9),
        })),

      prevStep: () =>
        set((state) => ({
          currentStep: Math.max(state.currentStep - 1, 1),
        })),

      goToStep: (step) => {
        const { canGoToStep } = get();
        if (canGoToStep(step)) {
          set({ currentStep: step });
        }
      },

      canGoToStep: (step) => {
        const { completedSteps } = get();
        if (step === 1) return true;
        // Can go to a step if all previous steps are completed
        for (let i = 1; i < step; i++) {
          if (!completedSteps.includes(i)) return false;
        }
        return true;
      },

      resetWizard: () => set(initialState),
    }),
    {
      name: "funeral-cover-wizard-v1",
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        applicationId: state.applicationId,
        clientId: state.clientId,
        step1: state.step1,
        step2: state.step2,
        step3: state.step3,
        step4: state.step4,
        step5: state.step5,
        step6: state.step6,
        step7: state.step7,
        step8: state.step8,
      }),
    }
  )
);
