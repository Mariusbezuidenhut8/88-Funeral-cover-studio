"use client";

import { useState } from "react";
import { Eye, EyeOff, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import { useWizardStore } from "@/lib/store/wizard.store";
import { toast } from "sonner";
import type {
  CalculatorStepData,
  FactFindStepData,
  NeedsAnalysisStepData,
  ProductSelectionStepData,
  ConfigurationStepData,
} from "@/types/application.types";

export interface StepProps {
  onComplete: () => void;
}

function ROARow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500 sm:w-48 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-900">{value ?? "—"}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
      </div>
      <dl className="px-4 py-1">{children}</dl>
    </div>
  );
}

function ROAPreview({
  step1, step2, step3, step4, step5, motivation,
}: {
  step1: CalculatorStepData | undefined;
  step2: FactFindStepData | undefined;
  step3: NeedsAnalysisStepData | undefined;
  step4: ProductSelectionStepData | undefined;
  step5: ConfigurationStepData | undefined;
  motivation: string;
}) {
  const client = step2?.client;
  const now = new Date().toLocaleDateString("en-ZA", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="rounded-2xl border-2 border-gray-300 bg-white p-6 sm:p-8 font-serif print:p-0">
      {/* Header */}
      <div className="border-b-2 border-gray-800 pb-4 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              RECORD OF ADVICE
            </h2>
            <p className="text-sm text-gray-500 font-sans mt-0.5">
              Financial Advisory and Intermediary Services Act, 37 of 2002
            </p>
          </div>
          <div className="text-right text-sm font-sans text-gray-600">
            <p>
              <strong>Date:</strong> {now}
            </p>
            <p>
              <strong>FSP:</strong> Fairbairn Consult (Pty) Ltd
            </p>
          </div>
        </div>
      </div>

      {/* Client */}
      <section className="mb-6">
        <h3 className="text-base font-bold text-gray-800 mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">
          1. Client Details
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-sans">
          <div>
            <span className="text-gray-500">Full Name: </span>
            <strong>
              {client?.firstName} {client?.lastName}
            </strong>
          </div>
          <div>
            <span className="text-gray-500">ID Number: </span>
            <strong>{client?.idNumber}</strong>
          </div>
          <div>
            <span className="text-gray-500">Mobile: </span>
            <strong>{client?.mobile}</strong>
          </div>
          <div>
            <span className="text-gray-500">Email: </span>
            <strong>{client?.email}</strong>
          </div>
          <div className="col-span-2">
            <span className="text-gray-500">Address: </span>
            <strong>
              {client?.address
                ? `${client.address.line1}, ${client.address.suburb}, ${client.address.city}, ${client.address.province}, ${client.address.postalCode}`
                : "—"}
            </strong>
          </div>
        </div>
      </section>

      {/* Needs Analysis */}
      <section className="mb-6">
        <h3 className="text-base font-bold text-gray-800 mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">
          2. Needs Analysis Summary
        </h3>
        <div className="font-sans text-sm">
          <table className="w-full">
            <tbody>
              <tr>
                <td className="py-1 text-gray-600">Total Funeral Cost Estimate</td>
                <td className="py-1 text-right font-semibold">
                  {formatZAR(step3?.totalFuneralCost ?? 0, { showDecimals: false })}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">Less: Existing Cover</td>
                <td className="py-1 text-right font-semibold">
                  ({formatZAR(step3?.existingCoverTotal ?? 0, { showDecimals: false })})
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-600">Less: Cash Savings</td>
                <td className="py-1 text-right font-semibold">
                  ({formatZAR(step3?.cashSavings ?? 0, { showDecimals: false })})
                </td>
              </tr>
              <tr className="border-t border-gray-300 font-bold">
                <td className="py-1">Cover Shortfall</td>
                <td className="py-1 text-right">
                  {formatZAR(step3?.coverShortfall ?? 0, { showDecimals: false })}
                </td>
              </tr>
              <tr className="text-green-800 font-bold bg-green-50">
                <td className="py-1 px-2">Recommended Cover</td>
                <td className="py-1 px-2 text-right">
                  {formatZAR(step3?.recommendedCover ?? 0, { showDecimals: false })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Selected Product */}
      <section className="mb-6">
        <h3 className="text-base font-bold text-gray-800 mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">
          3. Product Selected &amp; Configuration
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm font-sans">
          <div>
            <span className="text-gray-500">Product: </span>
            <strong>{step4?.selectedProductName ?? "—"}</strong>
          </div>
          <div>
            <span className="text-gray-500">Sum Assured: </span>
            <strong>
              {formatZAR(step5?.sumAssured ?? 0, { showDecimals: false })}
            </strong>
          </div>
          <div>
            <span className="text-gray-500">Monthly Premium: </span>
            <strong>{formatZAR(step5?.monthlyPremium ?? 0)}</strong>
          </div>
          <div>
            <span className="text-gray-500">Family Members: </span>
            <strong>{step5?.members?.length ?? 0}</strong>
          </div>
        </div>
      </section>

      {/* Adviser Motivation */}
      <section className="mb-6">
        <h3 className="text-base font-bold text-gray-800 mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">
          4. Adviser Recommendation &amp; Motivation
        </h3>
        <p className="font-sans text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
          {motivation || "[Adviser motivation will appear here]"}
        </p>
      </section>

      {/* Needs analysis notes */}
      {step3?.adviserNotes && (
        <section className="mb-6">
          <h3 className="text-base font-bold text-gray-800 mb-2 uppercase tracking-wide border-b border-gray-200 pb-1">
            5. Adviser Notes (Needs Analysis)
          </h3>
          <p className="font-sans text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {step3.adviserNotes}
          </p>
        </section>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t-2 border-gray-300 text-xs text-gray-500 font-sans">
        This Record of Advice is generated in terms of the FAIS General Code of Conduct and must be
        retained for a period of 5 years. Fairbairn Consult (Pty) Ltd — FSP XXXX.
      </div>
    </div>
  );
}

export default function Step7RecordOfAdvice({ onComplete }: StepProps) {
  const { step1, step2, step3, step4, step5, saveStep7 } = useWizardStore();

  const [motivation, setMotivation] = useState("");
  const [motivationError, setMotivationError] = useState("");
  const [showROAPreview, setShowROAPreview] = useState(false);

  const client = step2?.client;

  // Auto-generate "why recommended over alternatives" text
  const autoReason = step4?.selectionReason
    ? `${step4.selectedProductName} was selected because: ${step4.selectionReason}.`
    : `${step4?.selectedProductName ?? "The selected product"} achieved the highest suitability score across cover adequacy, affordability, and family member coverage criteria.`;

  function handleComplete() {
    if (motivation.trim().length < 50) {
      setMotivationError(
        "Please provide a recommendation motivation of at least 50 characters."
      );
      return;
    }
    setMotivationError("");

    const now = new Date().toISOString();
    saveStep7({
      recommendationMotivation: motivation.trim(),
      productsConsidered: step4?.selectedProductId
        ? [
            {
              productId: step4.selectedProductId,
              productName: step4.selectedProductName,
              reason: autoReason,
            },
          ]
        : [],
      adviserConfirmed: true,
      generatedAt: now,
      completedAt: now,
    });
    toast.success("Record of Advice saved.");
    onComplete();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Record of Advice
        </h2>
        <p className="text-sm text-gray-500">
          Review the advice summary, add your motivation, and preview the Record of
          Advice before proceeding.
        </p>
      </div>

      {/* Summary sections */}
      <Section title="Client Details">
        <ROARow
          label="Full Name"
          value={`${client?.firstName ?? ""} ${client?.lastName ?? ""}`}
        />
        <ROARow label="SA ID Number" value={client?.idNumber} />
        <ROARow label="Mobile" value={client?.mobile} />
        <ROARow label="Email" value={client?.email} />
        <ROARow
          label="Address"
          value={
            client?.address
              ? `${client.address.line1}, ${client.address.suburb}, ${client.address.city}`
              : undefined
          }
        />
        <ROARow label="Monthly Income" value={formatZAR(client?.monthlyIncome ?? 0, { showDecimals: false })} />
      </Section>

      <Section title="Needs Analysis Summary">
        <ROARow
          label="Total Funeral Cost"
          value={formatZAR(step3?.totalFuneralCost ?? 0, { showDecimals: false })}
        />
        <ROARow
          label="Existing Cover"
          value={formatZAR(step3?.existingCoverTotal ?? 0, { showDecimals: false })}
        />
        <ROARow
          label="Cash Savings"
          value={formatZAR(step3?.cashSavings ?? 0, { showDecimals: false })}
        />
        <ROARow
          label="Cover Shortfall"
          value={formatZAR(step3?.coverShortfall ?? 0, { showDecimals: false })}
        />
        <ROARow
          label="Recommended Cover"
          value={
            <span className="text-green-700 font-bold">
              {formatZAR(step3?.recommendedCover ?? 0, { showDecimals: false })}
            </span>
          }
        />
      </Section>

      <Section title="Selected Product & Configuration">
        <ROARow label="Product" value={step4?.selectedProductName} />
        <ROARow
          label="Sum Assured"
          value={formatZAR(step5?.sumAssured ?? 0, { showDecimals: false })}
        />
        <ROARow
          label="Monthly Premium"
          value={formatZAR(step5?.monthlyPremium ?? 0)}
        />
        <ROARow
          label="Family Members"
          value={step5?.members?.length ?? 0}
        />
        <ROARow
          label="Beneficiaries"
          value={step5?.beneficiaries?.length ?? 0}
        />
      </Section>

      {/* Why recommended */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
          Why recommended over alternatives
        </p>
        <p className="text-sm text-blue-900">{autoReason}</p>
      </div>

      {/* Adviser motivation */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Adviser Recommendation Motivation{" "}
          <span className="text-red-500">*</span>
          <span className="ml-2 text-xs text-gray-400 font-normal">
            (min. 50 characters)
          </span>
        </label>
        <textarea
          value={motivation}
          onChange={(e) => {
            setMotivation(e.target.value);
            if (motivationError && e.target.value.trim().length >= 50) {
              setMotivationError("");
            }
          }}
          rows={5}
          placeholder="Describe why this product and cover amount is most suitable for the client's specific circumstances, needs, and objectives..."
          className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 resize-none
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors
            ${
              motivationError
                ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                : "border-gray-300"
            }`}
        />
        <div className="flex items-center justify-between">
          {motivationError ? (
            <p className="text-xs text-red-600">{motivationError}</p>
          ) : (
            <span />
          )}
          <span
            className={`text-xs ${
              motivation.trim().length >= 50 ? "text-green-600" : "text-gray-400"
            }`}
          >
            {motivation.trim().length} / 50 min
          </span>
        </div>
      </div>

      {/* Preview toggle */}
      <div className="flex flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowROAPreview((v) => !v)}
          className="self-start flex items-center gap-2"
        >
          {showROAPreview ? (
            <>
              <EyeOff className="w-4 h-4" />
              Hide Preview
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Preview Record of Advice
            </>
          )}
        </Button>

        {showROAPreview && (
          <div className="mt-2">
            <ROAPreview
              step1={step1}
              step2={step2}
              step3={step3}
              step4={step4}
              step5={step5}
              motivation={motivation}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleComplete}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8"
        >
          Confirm &amp; Continue
        </Button>
      </div>
    </div>
  );
}
