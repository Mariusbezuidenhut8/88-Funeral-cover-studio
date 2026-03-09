"use client";

import { useState, useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import {
  buildCostBreakdown,
  DEFAULT_COST_ITEMS,
} from "@/lib/engine/needs-calculator";
import { useWizardStore } from "@/lib/store/wizard.store";
import { CostCategory } from "@/types/calculator.types";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

const COST_KEYS = Object.keys(DEFAULT_COST_ITEMS) as CostCategory[];

type AmountMap = Record<CostCategory, number>;

function buildInitialAmounts(): AmountMap {
  const result = {} as AmountMap;
  for (const key of COST_KEYS) {
    result[key] = DEFAULT_COST_ITEMS[key].defaultAmount;
  }
  return result;
}

export default function Step1Calculator({ onComplete }: StepProps) {
  const { saveStep1 } = useWizardStore();
  const [amounts, setAmounts] = useState<AmountMap>(buildInitialAmounts);

  const breakdown = useMemo(() => {
    return buildCostBreakdown(amounts);
  }, [amounts]);

  function handleAmountChange(key: CostCategory, rawValue: string) {
    const num = parseFloat(rawValue.replace(/[^0-9.]/g, "")) || 0;
    setAmounts((prev) => ({ ...prev, [key]: num }));
  }

  function handleReset() {
    setAmounts(buildInitialAmounts());
    toast.info("Costs reset to default values.");
  }

  function handleComplete() {
    const data = {
      costBreakdown: breakdown,
      completedAt: new Date().toISOString(),
    };
    saveStep1(data);
    toast.success("Funeral cost estimate saved.");
    onComplete();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Funeral Cost Estimator
        </h2>
        <p className="text-sm text-gray-500">
          Adjust each cost category to reflect your client&apos;s expected
          funeral expenses. Cultural items are marked separately.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {COST_KEYS.map((key) => {
          const item = DEFAULT_COST_ITEMS[key];
          return (
            <div
              key={key}
              className="rounded-xl border border-gray-200 bg-white p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">
                    {item.label}
                  </span>
                  {item.isCultural && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200">
                      Cultural
                    </span>
                  )}
                  {item.isOptional && !item.isCultural && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 border border-gray-200">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
              </div>
              <div className="flex items-center gap-2 sm:ml-4 shrink-0">
                <span className="text-sm text-gray-500 font-medium">R</span>
                <input
                  type="number"
                  min={item.minAmount}
                  max={item.maxAmount}
                  step={item.step}
                  value={amounts[key]}
                  onChange={(e) => handleAmountChange(key, e.target.value)}
                  className="w-32 rounded-lg border border-gray-300 px-3 py-2 text-sm text-right text-gray-900
                    focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Running total */}
      <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium text-gray-700">
            Total Funeral Cost
          </span>
          <span className="text-2xl font-bold text-gray-900">
            {formatZAR(breakdown.total, { showDecimals: false })}
          </span>
        </div>
        <div className="border-t border-green-200 pt-3 flex items-center justify-between">
          <div>
            <span className="text-base font-semibold text-green-800">
              Recommended Cover
            </span>
            <p className="text-xs text-green-600 mt-0.5">
              Includes 15% contingency buffer, rounded to nearest R2,500
            </p>
          </div>
          <span className="text-3xl font-extrabold text-green-700">
            {formatZAR(breakdown.recommendedCover, { showDecimals: false })}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Button
          variant="outline"
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 text-gray-600 border-gray-300"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to defaults
        </Button>

        <Button
          type="button"
          onClick={handleComplete}
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6"
        >
          Save &amp; Continue
        </Button>
      </div>
    </div>
  );
}
