"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  User,
  TrendingUp,
  ShieldAlert,
  Info,
  Minus,
  Equal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import {
  calculateNeedsAnalysis,
  AffordabilityStatus,
} from "@/lib/engine/needs-calculator";
import { INCOME_BRACKET_MIDPOINTS, IncomeBracket } from "@/types/client.types";
import { useWizardStore } from "@/lib/store/wizard.store";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

// ─── Income bracket display labels ───────────────────────────────────────────
const BRACKET_LABELS: Record<IncomeBracket, string> = {
  "under-3000": "Under R3,000",
  "3000-6000": "R3,000 – R6,000",
  "6000-10000": "R6,000 – R10,000",
  "10000-20000": "R10,000 – R20,000",
  "over-20000": "Over R20,000",
};

// ─── Affordability status config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<
  AffordabilityStatus,
  { label: string; color: string; bg: string; border: string; barColor: string }
> = {
  comfortable: {
    label: "Comfortable",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    barColor: "bg-green-500",
  },
  moderate: {
    label: "Moderate",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    barColor: "bg-blue-500",
  },
  caution: {
    label: "Caution",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    barColor: "bg-amber-500",
  },
  warning: {
    label: "Above Recommended",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    barColor: "bg-red-500",
  },
};

// ─── Small helper components ──────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col gap-1 ${
        highlight
          ? "border-green-400 bg-green-50"
          : "border-gray-200 bg-white"
      }`}
    >
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <span
        className={`text-2xl font-extrabold ${
          highlight ? "text-green-700" : "text-gray-900"
        }`}
      >
        {value}
      </span>
      {sub && (
        <span className="text-xs text-gray-400 leading-tight">{sub}</span>
      )}
    </div>
  );
}

function GapRow({
  label,
  value,
  operator,
  bold,
  valueColor,
}: {
  label: React.ReactNode;
  value: string;
  operator?: "minus" | "equals";
  bold?: boolean;
  valueColor?: string;
}) {
  return (
    <tr className={bold ? "bg-gray-50 border-t-2 border-gray-200" : "border-b border-gray-100"}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {operator === "minus" && (
            <Minus className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          {operator === "equals" && (
            <Equal className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          )}
          <span
            className={`text-sm ${bold ? "font-semibold text-gray-800" : "text-gray-600"}`}
          >
            {label}
          </span>
        </div>
      </td>
      <td
        className={`px-4 py-3 text-right font-${bold ? "bold text-lg" : "medium text-base"} ${
          valueColor ?? "text-gray-900"
        }`}
      >
        {value}
      </td>
    </tr>
  );
}

// ─── Affordability bar ────────────────────────────────────────────────────────
function AffordabilityBar({ ratio, status }: { ratio: number; status: AffordabilityStatus }) {
  // Bar fills from 0–12% mapped to 0–100%
  const pct = Math.min(100, (ratio / 12) * 100);
  const cfg = STATUS_CONFIG[status];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-xs text-gray-500">
        <span>0%</span>
        <span className="text-green-600 font-medium">2–5% ideal</span>
        <span>12%+</span>
      </div>
      <div className="relative h-3 rounded-full bg-gray-200 overflow-hidden">
        {/* Ideal zone shading */}
        <div
          className="absolute inset-y-0 bg-green-100"
          style={{ left: "16.7%", width: "16.6%" }}
        />
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${cfg.barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between">
        <span className={`text-xs font-semibold ${cfg.color}`}>
          {cfg.label} — {ratio.toFixed(1)}% of income
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Step3NeedsAnalysis({ onComplete }: StepProps) {
  const { step1, step2, saveStep3 } = useWizardStore();

  const totalFuneralCost = step1?.costBreakdown?.total ?? 0;
  const client = step2?.client;
  const existingCoverTotal =
    client?.existingCover?.reduce((s, c) => s + (c.sumAssured ?? 0), 0) ?? 0;
  const incomeBracket = (client?.incomeBracket ?? "3000-6000") as IncomeBracket;
  const monthlyIncome = client?.monthlyIncome ?? INCOME_BRACKET_MIDPOINTS[incomeBracket];
  const incomeBracketLabel = BRACKET_LABELS[incomeBracket];
  const maritalStatus = client?.maritalStatus ?? "single";
  const hasSpouseOrPartner =
    maritalStatus === "married" || maritalStatus === "living-with-partner";

  const [cashSavings, setCashSavings] = useState(0);
  const [adviserNotes, setAdviserNotes] = useState("");
  const [notesError, setNotesError] = useState("");

  const analysis = useMemo(() => {
    return calculateNeedsAnalysis({
      totalFuneralCost,
      existingCoverTotal,
      cashSavings,
      monthlyIncome,
      incomeBracketLabel,
      hasSpouseOrPartner,
      existingMemberCount: client?.existingCover?.length ?? 0,
    });
  }, [
    totalFuneralCost,
    existingCoverTotal,
    cashSavings,
    monthlyIncome,
    incomeBracketLabel,
    hasSpouseOrPartner,
    client?.existingCover?.length,
  ]);

  const { affordabilityRange, affordabilityStatus } = analysis;

  // Affordability ratio using the midpoint of the affordable range as proxy premium
  const proxPremiumForRatio = Math.round(
    (affordabilityRange.minPremium + affordabilityRange.maxPremium) / 2
  );
  const displayRatio = monthlyIncome > 0
    ? (proxPremiumForRatio / monthlyIncome) * 100
    : 3.5; // sensible default if no income

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
      affordabilityRatio: displayRatio,
      adviserNotes: adviserNotes.trim(),
      completedAt: now,
    });
    toast.success("Needs analysis saved.");
    onComplete();
  }

  const cfg = STATUS_CONFIG[affordabilityStatus];

  return (
    <div className="flex flex-col gap-7">

      {/* ── Page heading ── */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Needs Analysis</h2>
        <p className="text-sm text-gray-500">
          A personalised cover assessment based on estimated funeral costs,
          existing cover, and your income.
        </p>
      </div>

      {/* ── Hero metrics row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard
          label="Estimated Funeral Cost"
          value={formatZAR(totalFuneralCost, { showDecimals: false })}
          sub="Based on your calculator inputs"
        />
        <MetricCard
          label="Recommended Cover"
          value={formatZAR(analysis.recommendedCover, { showDecimals: false })}
          sub="Shortfall + 15% contingency buffer"
          highlight
        />
        <MetricCard
          label="Affordable Premium Range"
          value={`${formatZAR(affordabilityRange.minPremium, { showDecimals: false })} – ${formatZAR(affordabilityRange.maxPremium, { showDecimals: false })}`}
          sub="Per month (2–5% of income)"
        />
      </div>

      {/* ── Cover gap table ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">
          Cover Gap Calculation
        </h3>
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <GapRow
                label="Estimated funeral cost"
                value={formatZAR(totalFuneralCost, { showDecimals: false })}
              />
              <GapRow
                label="Less: Existing funeral / life cover"
                value={`− ${formatZAR(existingCoverTotal, { showDecimals: false })}`}
                operator="minus"
                valueColor="text-green-700"
              />
              <GapRow
                label={
                  <span className="flex items-center gap-1.5">
                    Less: Cash / savings available
                    <span className="text-[11px] text-gray-400">(editable)</span>
                  </span>
                }
                value=""
                operator="minus"
              />
              {/* Savings inline input row */}
              <tr className="border-b border-gray-100">
                <td colSpan={2} className="px-4 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-gray-500 font-medium">−&nbsp;R</span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      value={cashSavings}
                      onChange={(e) =>
                        setCashSavings(parseFloat(e.target.value) || 0)
                      }
                      className="w-32 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-right
                        text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500
                        focus:border-green-500 transition-colors"
                    />
                  </div>
                </td>
              </tr>
              <GapRow
                label="= Cover shortfall"
                value={formatZAR(analysis.coverShortfall, { showDecimals: false })}
                operator="equals"
                bold
                valueColor={
                  analysis.coverShortfall > 0 ? "text-red-600" : "text-green-600"
                }
              />
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Affordability assessment ── */}
      <div className={`rounded-xl border p-5 flex flex-col gap-4 ${cfg.bg} ${cfg.border}`}>
        <div className="flex items-center gap-2">
          <TrendingUp className={`w-5 h-5 shrink-0 ${cfg.color}`} />
          <h3 className={`text-sm font-semibold ${cfg.color}`}>
            Affordability Assessment
          </h3>
        </div>

        <div className="flex flex-col gap-1">
          <p className="text-sm text-gray-700">
            Based on your income bracket{" "}
            <span className="font-semibold text-gray-900">
              ({incomeBracketLabel} / month)
            </span>
            :
          </p>
          <p className={`text-lg font-bold ${cfg.color}`}>
            Recommended premium range:{" "}
            {formatZAR(affordabilityRange.minPremium, { showDecimals: false })} –{" "}
            {formatZAR(affordabilityRange.maxPremium, { showDecimals: false })} per month
          </p>
          <p className="text-xs text-gray-500">
            This is 2–5% of your income. Keeping premiums within this range helps ensure
            the policy remains affordable over the long term.
          </p>
        </div>

        <AffordabilityBar ratio={displayRatio} status={affordabilityStatus} />

        <div className="grid grid-cols-3 gap-3 pt-1">
          {[
            {
              label: "Min (2%)",
              value: formatZAR(affordabilityRange.minPremium, { showDecimals: false }),
              sub: "/month",
            },
            {
              label: "Mid (3.5%)",
              value: formatZAR(
                Math.round(monthlyIncome * 0.035),
                { showDecimals: false }
              ),
              sub: "/month",
            },
            {
              label: "Max (5%)",
              value: formatZAR(affordabilityRange.maxPremium, { showDecimals: false }),
              sub: "/month",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg bg-white/70 border border-white px-3 py-2 text-center"
            >
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-sm font-bold text-gray-900">
                {item.value}
                <span className="text-xs font-normal text-gray-400 ml-0.5">
                  {item.sub}
                </span>
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Family cover recommendation ── */}
      <div
        className={`rounded-xl border p-4 flex items-start gap-3 ${
          analysis.familyCoverRecommended
            ? "bg-blue-50 border-blue-200"
            : "bg-gray-50 border-gray-200"
        }`}
      >
        {analysis.familyCoverRecommended ? (
          <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        ) : (
          <User className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
        )}
        <div>
          <p
            className={`text-sm font-semibold ${
              analysis.familyCoverRecommended ? "text-blue-800" : "text-gray-700"
            }`}
          >
            {analysis.familyCoverRecommended
              ? "Family Cover Recommended"
              : "Individual Cover Suitable"}
          </p>
          <p
            className={`text-sm mt-0.5 ${
              analysis.familyCoverRecommended ? "text-blue-700" : "text-gray-500"
            }`}
          >
            {analysis.familyCoverRecommended
              ? maritalStatus === "married" || maritalStatus === "living-with-partner"
                ? "You are married or living with a partner. A family policy covering your spouse and children is strongly recommended."
                : "You have existing dependants. A family policy is recommended to protect those who depend on you."
              : "Based on your circumstances, individual cover will meet your current needs. You can add family members later."}
          </p>
        </div>
      </div>

      {/* ── Warnings ── */}
      {analysis.warnings.length > 0 && (
        <div className="flex flex-col gap-2">
          {analysis.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
            >
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary statement ── */}
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-4 flex items-start gap-3">
        <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-sm text-gray-600 leading-relaxed">
          Based on an estimated funeral cost of{" "}
          <strong>{formatZAR(totalFuneralCost, { showDecimals: false })}</strong>, we
          recommend a cover amount of{" "}
          <strong className="text-green-700">
            {formatZAR(analysis.recommendedCover, { showDecimals: false })}
          </strong>
          . Within your income bracket, an affordable monthly premium of{" "}
          <strong>
            {formatZAR(affordabilityRange.minPremium, { showDecimals: false })} –{" "}
            {formatZAR(affordabilityRange.maxPremium, { showDecimals: false })}
          </strong>{" "}
          per month is suitable.
          {analysis.familyCoverRecommended &&
            " Family cover is recommended based on your marital status."}
        </p>
      </div>

      {/* ── Adviser notes ── */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Adviser Notes{" "}
          <span className="text-red-500">*</span>
          <span className="ml-2 text-xs text-gray-400 font-normal">
            (minimum 50 characters — required for Record of Advice)
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
          placeholder="Document the client's specific circumstances, reasons for the recommended cover amount, affordability considerations, and any relevant factors discussed..."
          className={`w-full rounded-xl border px-4 py-3 text-sm text-gray-900 placeholder-gray-400 resize-none
            focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors
            ${notesError ? "border-red-400 focus:ring-red-400 focus:border-red-400" : "border-gray-300"}`}
        />
        <div className="flex items-center justify-between">
          {notesError ? (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              {notesError}
            </p>
          ) : (
            <span />
          )}
          <span
            className={`text-xs tabular-nums ${
              adviserNotes.trim().length >= 50 ? "text-green-600 font-medium" : "text-gray-400"
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
