"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CheckCircle2,
  Star,
  AlertTriangle,
  Loader2,
  TrendingDown,
  Shield,
  Users,
  Info,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import { recommendProducts } from "@/lib/engine/product-recommender";
import { useWizardStore } from "@/lib/store/wizard.store";
import { Product, ProductRecommendation, ProductRole } from "@/types/product.types";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

// ─── Role configuration ───────────────────────────────────────────────────────

const ROLE_CONFIG: Record<
  Exclude<ProductRole, "alternative">,
  {
    badge: string;
    badgeCls: string;
    borderCls: string;
    headerCls: string;
    Icon: React.FC<{ className?: string }>;
    selectCls: string;
  }
> = {
  recommended: {
    badge: "Recommended for You",
    badgeCls: "bg-green-600 text-white",
    borderCls: "border-green-400 shadow-lg shadow-green-100",
    headerCls: "bg-green-50",
    Icon: Star,
    selectCls: "bg-green-600 hover:bg-green-700 text-white",
  },
  lower_cost: {
    badge: "Lower Monthly Premium",
    badgeCls: "bg-blue-600 text-white",
    borderCls: "border-blue-300",
    headerCls: "bg-blue-50",
    Icon: TrendingDown,
    selectCls: "bg-blue-700 hover:bg-blue-800 text-white",
  },
  broader: {
    badge: "Broader Family Protection",
    badgeCls: "bg-purple-600 text-white",
    borderCls: "border-purple-300",
    headerCls: "bg-purple-50",
    Icon: Users,
    selectCls: "bg-purple-700 hover:bg-purple-800 text-white",
  },
};

const TIER_BADGE: Record<string, string> = {
  basic: "bg-gray-100 text-gray-600",
  standard: "bg-blue-100 text-blue-700",
  premium: "bg-purple-100 text-purple-700",
  elite: "bg-amber-100 text-amber-700",
};

// ─── Cover structure display ──────────────────────────────────────────────────

function CoverStructureRow({
  label,
  amount,
  note,
}: {
  label: string;
  amount: number;
  note?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-gray-900">
          {formatZAR(amount, { showDecimals: false })}
        </span>
        {note && (
          <span className="block text-[11px] text-gray-400">{note}</span>
        )}
      </div>
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  rec,
  isSelected,
  onSelect,
}: {
  rec: ProductRecommendation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [showFeatures, setShowFeatures] = useState(false);
  const role = rec.role as Exclude<ProductRole, "alternative">;
  const cfg = ROLE_CONFIG[role];
  const tierCls = TIER_BADGE[rec.product.tier] ?? TIER_BADGE.basic;
  const { coverStructure } = rec;

  return (
    <div
      className={`relative rounded-2xl border-2 flex flex-col overflow-hidden transition-all duration-150
        ${cfg.borderCls}
        ${isSelected ? "ring-2 ring-offset-2 ring-green-500" : ""}
      `}
    >
      {/* Role badge */}
      <div className={`px-5 py-3 flex items-center gap-2 ${cfg.headerCls}`}>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cfg.badgeCls}`}
        >
          <cfg.Icon className="w-3 h-3" />
          {cfg.badge}
        </span>
        {isSelected && (
          <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-700">
            <BadgeCheck className="w-4 h-4" />
            Selected
          </span>
        )}
      </div>

      {/* Main content */}
      <div className="px-5 py-4 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 leading-tight">
              {rec.product.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{rec.product.insurer}</p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${tierCls}`}
          >
            {rec.product.tier}
          </span>
        </div>

        {/* Cover structure */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Cover amounts
          </p>
          <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-1">
            <CoverStructureRow
              label="Main Member"
              amount={coverStructure.mainMember}
            />
            {coverStructure.spouse !== null && (
              <CoverStructureRow
                label="Spouse / Partner"
                amount={coverStructure.spouse}
              />
            )}
            {coverStructure.child !== null && (
              <CoverStructureRow
                label="Each Child"
                amount={coverStructure.child}
                note="illustration — adjust in next step"
              />
            )}
            {/* Parent cover available badge — shown on products that support parent members */}
            {rec.product.memberTypes.some((m) => m.type === "parent") && (
              <div className="flex items-center justify-between py-1.5">
                <span className="text-sm text-gray-600">Parent cover</span>
                <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  Available to add
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Suitability reasons — label varies by role */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            {role === "recommended" ? "Why this fits:" : "Best for:"}
          </p>
          <ul className="flex flex-col gap-1.5">
            {rec.suitabilityReasons.map((reason, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                {reason}
              </li>
            ))}
          </ul>
        </div>

        {/* Waiting period */}
        <div className="flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2">
          <Shield className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="text-xs text-gray-600">
            <span className="font-medium">Waiting period: </span>
            {rec.product.waitingPeriodMonths} months natural death
            {rec.product.accidentalDeathWaitingPeriodMonths === 0
              ? " · Accidental death covered immediately"
              : ""}
          </div>
        </div>

        {/* Expandable features */}
        <button
          type="button"
          onClick={() => setShowFeatures(!showFeatures)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {showFeatures ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
          {showFeatures ? "Hide" : "Show"} all features
        </button>
        {showFeatures && (
          <ul className="flex flex-col gap-1">
            {rec.product.features.map((feat, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                {feat}
              </li>
            ))}
          </ul>
        )}

        {/* Warnings */}
        {rec.productWarnings.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {rec.productWarnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800">{w}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer: premium + select */}
      <div className="mt-auto px-5 py-4 border-t border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50">
        <div>
          <p className="text-xs text-gray-400">Est. monthly premium</p>
          <p className="text-xl font-extrabold text-gray-900">
            {formatZAR(rec.estimatedMonthlyPremium, { showDecimals: false })}
            <span className="text-sm font-normal text-gray-400 ml-1">/mo</span>
          </p>
        </div>
        <Button
          type="button"
          onClick={onSelect}
          className={`shrink-0 font-semibold ${cfg.selectCls}`}
        >
          {isSelected ? "Selected" : "Select this option"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Step4ProductSelection({ onComplete }: StepProps) {
  const { step2, step3, saveStep4 } = useWizardStore();

  // Context from previous steps
  const age = step2?.client?.age ?? 35;
  const maritalStatus = step2?.client?.maritalStatus ?? "single";
  const hasSpouseOrPartner =
    maritalStatus === "married" || maritalStatus === "living-with-partner";
  const hasTerminalIllness = step2?.client?.hasTerminalIllness ?? false;
  const monthlyIncome = step2?.client?.monthlyIncome ?? 0;
  const existingCoverTotal = step3?.existingCoverTotal ?? 0;
  const recommendedCover = step3?.recommendedCover ?? 0;
  const familyRecommendation = step3?.familyRecommendation;
  const affordabilityMaxPremium = step3?.affordabilityMaxPremium ?? 0;
  const incomeBracketLabel = step3?.incomeBracketLabel ?? "";
  const familyCoverRecommended = step3?.familyCoverRecommended ?? false;

  // Derive hasChildren from existing cover members list (Step 2 doesn't explicitly track children count,
  // so we infer from familyCoverRecommended or marital status)
  const hasChildren = familyCoverRecommended && hasSpouseOrPartner;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAndRecommend() {
      try {
        setLoading(true);
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error(`Failed to load products (${res.status})`);
        const data: Product[] = await res.json();
        setProducts(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error");
        toast.error("Could not load products. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    fetchAndRecommend();
  }, []);

  const displayedOptions = useMemo(() => {
    if (products.length === 0) return [];
    const all = recommendProducts(products, {
      recommendedCover,
      monthlyIncome,
      mainMemberAge: age,
      requiredMemberTypes: [],
      familyMembers: [],
      hasSpouseOrPartner,
      hasChildren,
      hasTerminalIllness,
      existingCoverTotal,
      affordabilityMaxPremium,
      familyRecommendation: familyRecommendation
        ? {
            mainMember: familyRecommendation.mainMember,
            spouse: familyRecommendation.spouse,
            child: familyRecommendation.child,
          }
        : undefined,
    });
    // Show recommended + lower_cost + broader (skip alternatives)
    return all.filter((r) => r.role !== "alternative");
  }, [
    products,
    recommendedCover,
    monthlyIncome,
    age,
    hasSpouseOrPartner,
    hasChildren,
    hasTerminalIllness,
    existingCoverTotal,
    affordabilityMaxPremium,
    familyRecommendation,
  ]);

  function handleSelect(rec: ProductRecommendation) {
    setSelectedId(rec.product.id);

    const alternativeOptions = displayedOptions
      .filter((r) => r.product.id !== rec.product.id)
      .map((r) => ({
        productId: r.product.id,
        productName: r.product.name,
        role: r.role,
        estimatedMonthlyPremium: r.estimatedMonthlyPremium,
      }));

    saveStep4({
      selectedProductId: rec.product.id,
      selectedProductName: rec.product.name,
      selectedProductTier: rec.product.tier,
      insurer: rec.product.insurer,
      estimatedMonthlyPremium: rec.estimatedMonthlyPremium,
      coverStructure: {
        mainMember: rec.coverStructure.mainMember,
        spouse: rec.coverStructure.spouse,
        child: rec.coverStructure.child,
      },
      suitabilityReasons: rec.suitabilityReasons,
      productWarnings: rec.productWarnings,
      alternativeOptions,
      selectionReason: rec.suitabilityReasons.slice(0, 2).join("; "),
      completedAt: new Date().toISOString(),
    });

    toast.success(`${rec.product.name} selected.`);
    onComplete();
  }

  // ── Loading / error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <p className="text-sm text-gray-500">Loading available products…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 max-w-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-700">Could not load products</p>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  if (displayedOptions.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          No suitable products found. Please contact your administrator.
        </p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Product Selection</h2>
        <p className="text-sm text-gray-500 leading-relaxed">
          Based on the information provided, we have identified the options below as
          suitable starting points for your funeral cover needs. You can review and
          adjust the cover amounts in the next step.
        </p>
      </div>

      {/* Compliance positioning statement */}
      <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
        <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-600 leading-relaxed">
          The recommended option below is based on your estimated funeral cost of{" "}
          <span className="font-semibold">
            {formatZAR(recommendedCover, { showDecimals: false })}
          </span>
          {incomeBracketLabel
            ? `, income bracket (${incomeBracketLabel})`
            : ""}
          {hasSpouseOrPartner ? ", and your family structure" : ""}. These are
          illustrations only — premiums shown are estimates and will be confirmed in the
          next step.
        </p>
      </div>

      {/* Health warning */}
      {hasTerminalIllness && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Health Declaration Notice</p>
            <p className="text-sm text-red-700 mt-0.5">
              A terminal illness has been declared. Standard funeral cover products may not
              be available without underwriting. Please confirm eligibility with the
              insurer before proceeding.
            </p>
          </div>
        </div>
      )}

      {/* Affordability context */}
      {affordabilityMaxPremium > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
          <p className="text-xs text-green-800 leading-relaxed">
            <span className="font-semibold">Affordability guidance: </span>
            Based on your income bracket, a monthly premium of up to{" "}
            <span className="font-semibold">
              {formatZAR(affordabilityMaxPremium, { showDecimals: false })}
            </span>{" "}
            is within recommended guidelines. Options showing a higher premium will
            display a warning.
          </p>
        </div>
      )}

      {/* Product cards */}
      <div className="flex flex-col gap-5">
        {displayedOptions.map((rec) => (
          <ProductCard
            key={rec.product.id}
            rec={rec}
            isSelected={selectedId === rec.product.id}
            onSelect={() => handleSelect(rec)}
          />
        ))}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500 leading-relaxed">
          <span className="font-semibold">Premium illustration: </span>
          Premiums shown are estimated illustrations based on the recommended cover
          amount and are for guidance only. Final premiums will be confirmed after
          configuring the exact cover and member details in the next step. All products
          are subject to underwriting acceptance.
        </p>
      </div>
    </div>
  );
}
