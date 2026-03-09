"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import { calculateNeedsAnalysis } from "@/lib/engine/needs-calculator";
import { useWizardStore } from "@/lib/store/wizard.store";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

export default function Step3NeedsAnalysis({ onComplete }: StepProps) {
  const { step1, step2, saveStep3 } = useWizardStore();

  const totalFuneralCost = step1?.costBreakdown?.total ?? 0;
  const existingCoverTotal =
    step2?.client?.existingCover?.reduce((s, c) => s + (c.sumAssured ?? 0), 0) ?? 0;
  const monthlyIncome = step2?.client?.monthlyIncome ?? 0;

  const [cashSavings, setCashSavings] = useState(0);
  const [adviserNotes, setAdviserNotes] = useState("");
  const [notesError, setNotesError] = useState("");

  const analysis = useMemo(() => {
    return calculateNeedsAnalysis({
      totalFuneralCost,
      existingCoverTotal,
      cashSavings,
      monthlyIncome,
    });
  }, [totalFuneralCost, existingCoverTotal, cashSavings, monthlyIncome]);

  function handleComplete() {
    if (adviserNotes.trim().length < 50) {
      setNotesError("Adviser notes must be at least 50 characters.");
      return;
    }
    setNotesError("");

    const now = new Date().toISOString();
    saveStep3({
      totalFuneralCost,
      existingCoverTotal,
      cashSavings,
      coverShortfall: analysis.coverShortfall,
      recommendedCover: analysis.recommendedCover,
      affordabilityRatio: analysis.affordabilityRatio,
      adviserNotes: adviserNotes.trim(),
      completedAt: now,
    });
    toast.success("Needs analysis saved.");
    onComplete();
  }

  const shortfallColor =
    analysis.coverShortfall > 0 ? "text-red-600" : "text-green-600";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Needs Analysis</h2>
        <p className="text-sm text-gray-500">
          Review the cover gap analysis based on the funeral cost estimate and existing
          cover.
        </p>
      </div>

      {/* Gap table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 text-gray-600">Total Funeral Cost</td>
              <td className="px-4 py-3 text-right font-medium text-gray-900">
                {formatZAR(totalFuneralCost, { showDecimals: false })}
              </td>
            </tr>
            <tr className="border-b border-gray-100 bg-gray-50">
              <td className="px-4 py-3 text-gray-600">Less: Existing Cover</td>
              <td className="px-4 py-3 text-right font-medium text-green-700">
                − {formatZAR(existingCoverTotal, { showDecimals: false })}
              </td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="px-4 py-3 text-gray-600">
                <div className="flex items-center gap-2 flex-wrap">
                  Less: Cash / Savings
                  <span className="text-xs text-gray-400">(editable)</span>
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-gray-500 text-sm">−&nbsp;R</span>
                  <input
                    type="number"
                    min={0}
                    step={500}
                    value={cashSavings}
                    onChange={(e) =>
                      setCashSavings(parseFloat(e.target.value) || 0)
                    }
                    className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-right text-gray-900
                      focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  />
                </div>
              </td>
            </tr>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td className="px-4 py-3 font-semibold text-gray-800">
                = Cover Shortfall
              </td>
              <td className={`px-4 py-3 text-right text-lg font-bold ${shortfallColor}`}>
                {formatZAR(analysis.coverShortfall, { showDecimals: false })}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recommended Cover */}
      <div className="rounded-xl border-2 border-green-300 bg-green-50 px-6 py-5 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span className="text-base font-semibold text-green-800">
            Recommended Cover Amount
          </span>
        </div>
        <p className="text-4xl font-extrabold text-green-700 mt-1">
          {formatZAR(analysis.recommendedCover, { showDecimals: false })}
        </p>
        <p className="text-xs text-green-600 mt-1">
          Calculated from the cover shortfall plus a 15% contingency buffer,
          rounded to the nearest R2,500.
        </p>
      </div>

      {/* Warnings */}
      {analysis.warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {analysis.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Affordability info */}
      {monthlyIncome > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            Based on the client&apos;s monthly income of{" "}
            <strong>{formatZAR(monthlyIncome, { showDecimals: false })}</strong>, the
            estimated premium as a percentage of income is{" "}
            <strong>{analysis.affordabilityRatio.toFixed(1)}%</strong>.{" "}
            {analysis.isAffordable ? (
              <span className="text-green-700 font-medium">
                This is within acceptable limits.
              </span>
            ) : (
              <span className="text-amber-700 font-medium">
                Consider whether this is sustainable for the client.
              </span>
            )}
          </p>
        </div>
      )}

      {/* Adviser Notes */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Adviser Notes <span className="text-red-500">*</span>
          <span className="ml-2 text-xs text-gray-400 font-normal">
            (min. 50 characters)
          </span>
        </label>
        <textarea
          value={adviserNotes}
          onChange={(e) => {
            setAdviserNotes(e.target.value);
            if (notesError && e.target.value.trim().length >= 50) {
              setNotesError("");
            }
          }}
          rows={5}
          placeholder="Document your needs analysis, client circumstances, and reasoning for the recommended cover amount..."
          className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 resize-none
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors
            ${notesError ? "border-red-400 focus:ring-red-400 focus:border-red-400" : "border-gray-300"}`}
        />
        <div className="flex items-center justify-between">
          {notesError ? (
            <p className="text-xs text-red-600">{notesError}</p>
          ) : (
            <span />
          )}
          <span
            className={`text-xs ${
              adviserNotes.trim().length >= 50 ? "text-green-600" : "text-gray-400"
            }`}
          >
            {adviserNotes.trim().length} / 50 min
          </span>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleComplete}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-8"
        >
          Save &amp; Continue
        </Button>
      </div>
    </div>
  );
}
