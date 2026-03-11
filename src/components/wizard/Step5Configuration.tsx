"use client";

import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  PlusCircle,
  Trash2,
  XCircle,
  Loader2,
  Plus,
  Minus,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatZAR } from "@/lib/utils/currency";
import { calculateFullPremium } from "@/lib/engine/premium-calculator";
import {
  checkAffordability,
  getGaugePosition,
  getGaugeSafeZone,
  AffordabilityResult,
} from "@/lib/engine/affordability-check";
import { useWizardStore } from "@/lib/store/wizard.store";
import { Product, MemberType } from "@/types/product.types";
import { FamilyMember, Beneficiary } from "@/types/family.types";
import { clamp } from "@/lib/engine/needs-calculator";
import { toast } from "sonner";

export interface StepProps {
  onComplete: () => void;
}

// ─── Cover bands ──────────────────────────────────────────────────────────────

const STANDARD_COVER_BANDS = [
  5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000, 60000, 75000, 100000,
];

function getBandsForProduct(product: Product): number[] {
  return STANDARD_COVER_BANDS.filter(
    (b) => b >= product.minSumAssured && b <= product.maxSumAssured
  );
}

function nearestBand(value: number, bands: number[]): number {
  if (bands.length === 0) return value;
  return bands.reduce((prev, curr) =>
    Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
  );
}

// ─── Labels ───────────────────────────────────────────────────────────────────

const MEMBER_LABELS: Record<MemberType, string> = {
  main: "Main Member",
  spouse: "Spouse / Partner",
  child: "Children",
  parent: "Parents",
  parent_in_law: "Parents-in-Law",
  extended: "Extended Family",
};

const MEMBER_DESCRIPTIONS: Record<MemberType, string> = {
  main: "The policyholder — always included",
  spouse: "Married spouse or life partner",
  child: "Biological, adopted or stepchildren",
  parent: "Your own parents",
  parent_in_law: "Your spouse's parents",
  extended: "Siblings, grandparents, aunts, uncles",
};

// Representative ages used for premium illustration
const REP_AGES: Partial<Record<MemberType, number>> = {
  child: 10,
  parent: 65,
  parent_in_law: 65,
  extended: 50,
};

const REP_AGE_LABELS: Partial<Record<MemberType, string>> = {
  spouse: "Illustration: same age band as main member",
  child: "Illustration: representative age 10",
  parent: "Illustration: representative age 65",
  parent_in_law: "Illustration: representative age 65",
  extended: "Illustration: representative age 50",
};

// ─── Optional add-ons ─────────────────────────────────────────────────────────
//
// Three add-ons only — filtered at runtime to exclude benefits already bundled
// in the selected product (e.g. FamilyCare Standard already includes grocery &
// tombstone, so those won't appear as optional add-ons for that product).

interface AddOn {
  id: string;
  name: string;
  description: string;
  monthlyCost: number;
}

const ALL_OPTIONAL_ADDONS: AddOn[] = [
  {
    id: "grocery_benefit",
    name: "Grocery Benefit",
    description: "Food voucher paid on an approved claim to help cover household costs.",
    monthlyCost: 12,
  },
  {
    id: "tombstone_benefit",
    name: "Tombstone Benefit",
    description: "Contribution towards tombstone and burial site preparation costs.",
    monthlyCost: 18,
  },
  {
    id: "premium_waiver",
    name: "Premium Waiver",
    description: "Premiums are waived for up to 6 months on disability or retrenchment.",
    monthlyCost: 20,
  },
  {
    id: "accidental_death",
    name: "Immediate Accidental Death Cover",
    description: "Death from an accident is covered from day 1 — no waiting period.",
    monthlyCost: 15,
  },
];

// ─── Category state ───────────────────────────────────────────────────────────

interface CategoryState {
  enabled: boolean;
  count: number;
  coverBand: number;
}

// ─── Build FamilyMember[] for premium calculation ─────────────────────────────

function buildFamilyMembers(
  cats: Partial<Record<MemberType, CategoryState>>,
  mainMemberAge: number
): { mainSumAssured: number; members: FamilyMember[] } {
  const mainSumAssured = cats.main?.coverBand ?? 10000;
  const members: FamilyMember[] = [];
  const nonMain: MemberType[] = [
    "spouse",
    "child",
    "parent",
    "parent_in_law",
    "extended",
  ];

  for (const type of nonMain) {
    const cat = cats[type];
    if (!cat?.enabled || cat.count === 0) continue;
    const repAge = type === "spouse" ? mainMemberAge : (REP_AGES[type] ?? 35);
    for (let i = 0; i < cat.count; i++) {
      const singularLabel =
        type === "spouse"
          ? "Spouse"
          : type === "child"
          ? `Child ${i + 1}`
          : type === "parent"
          ? `Parent ${i + 1}`
          : type === "parent_in_law"
          ? `Parent-in-Law ${i + 1}`
          : `Extended ${i + 1}`;
      members.push({
        id: `${type}-${i}`,
        type,
        firstName: singularLabel,
        lastName: "(illustrated)",
        age: repAge,
        sumAssured: cat.coverBand,
        isEligible: true,
      });
    }
  }

  return { mainSumAssured, members };
}

// ─── Beneficiary form ─────────────────────────────────────────────────────────

interface BeneForm {
  firstName: string;
  lastName: string;
  relationship: string;
  percentage: string;
}

const DEFAULT_BENE: BeneForm = {
  firstName: "",
  lastName: "",
  relationship: "",
  percentage: "",
};

// AffordabilityStatus and getAffordabilityStatus live in
// src/lib/engine/affordability-check.ts — imported above.

// ─── People covered summary text ──────────────────────────────────────────────

function describePeopleCovered(
  cats: Partial<Record<MemberType, CategoryState>>,
  mainName: string
): string {
  const parts: string[] = [];
  if (cats.main?.enabled) parts.push(`${mainName} (main member)`);
  if (cats.spouse?.enabled && (cats.spouse.count ?? 0) > 0)
    parts.push("1 spouse");
  if (cats.child?.enabled && (cats.child.count ?? 0) > 0) {
    const n = cats.child.count;
    parts.push(`${n} ${n === 1 ? "child" : "children"}`);
  }
  if (cats.parent?.enabled && (cats.parent.count ?? 0) > 0) {
    const n = cats.parent.count;
    parts.push(`${n} ${n === 1 ? "parent" : "parents"}`);
  }
  if (cats.parent_in_law?.enabled && (cats.parent_in_law.count ?? 0) > 0) {
    const n = cats.parent_in_law.count;
    parts.push(`${n} ${n === 1 ? "parent-in-law" : "parents-in-law"}`);
  }
  if (cats.extended?.enabled && (cats.extended.count ?? 0) > 0) {
    const n = cats.extended.count;
    parts.push(`${n} extended ${n === 1 ? "member" : "members"}`);
  }
  return parts.join(", ") || "Main member only";
}

function describeSelectedBenefits(
  included: { name: string }[],
  addOnState: Record<string, boolean>,
  availableAddOns: AddOn[]
): string {
  const active = [
    ...included.map((b) => b.name),
    ...availableAddOns.filter((a) => addOnState[a.id]).map((a) => a.name),
  ];
  if (active.length === 0) return "None";
  if (active.length <= 2) return active.join(", ");
  return `${active[0]}, ${active[1]} +${active.length - 2} more`;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">
      {children}
    </h3>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Step5Configuration({ onComplete }: StepProps) {
  const { step2, step3, step4, saveStep5 } = useWizardStore();

  const mainMemberAge = step2?.client?.age ?? 35;
  const mainFirstName = step2?.client?.firstName ?? "Client";
  const mainLastName = step2?.client?.lastName ?? "";
  const maritalStatus = step2?.client?.maritalStatus ?? "single";
  const selectedProductId = step4?.selectedProductId;

  const affordabilityMin = step3?.affordabilityMinPremium ?? 0;
  const affordabilityMax = step3?.affordabilityMaxPremium ?? 0;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  // Category state keyed by MemberType
  const [cats, setCats] = useState<Partial<Record<MemberType, CategoryState>>>(
    {}
  );

  // Add-on toggles — reset when product changes
  const [addOnState, setAddOnState] = useState<Record<string, boolean>>({});

  // Beneficiaries
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [showBeneForm, setShowBeneForm] = useState(false);
  const [beneForm, setBeneForm] = useState<BeneForm>({ ...DEFAULT_BENE });
  const [beneFormError, setBeneFormError] = useState("");

  const [errors, setErrors] = useState<string[]>([]);

  // ── Load product + pre-populate ─────────────────────────────────────────────

  useEffect(() => {
    if (!selectedProductId) {
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error();
        const all: Product[] = await res.json();
        const found = all.find((p) => p.id === selectedProductId) ?? null;
        setProduct(found);
        if (found) initCategories(found);
      } catch {
        toast.error("Failed to load product configuration.");
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductId]);

  function initCategories(p: Product) {
    const bands = getBandsForProduct(p);
    const fallbackBand = bands[0] ?? p.minSumAssured;

    const mainBand = nearestBand(
      clamp(
        step4?.coverStructure?.mainMember ?? step3?.recommendedCover ?? 10000,
        p.minSumAssured,
        p.maxSumAssured
      ),
      bands
    );

    const initial: Partial<Record<MemberType, CategoryState>> = {
      main: { enabled: true, count: 1, coverBand: mainBand },
    };

    // Spouse
    if (p.memberTypes.some((m) => m.type === "spouse")) {
      const spouseEnabled = ["married", "living-with-partner"].includes(
        maritalStatus
      );
      const spouseBand = nearestBand(
        clamp(
          step4?.coverStructure?.spouse ??
            step3?.familyRecommendation?.spouse ??
            mainBand,
          p.minSumAssured,
          p.maxSumAssured
        ),
        bands
      );
      initial.spouse = {
        enabled: spouseEnabled,
        count: 1,
        coverBand: spouseBand,
      };
    }

    // Children
    if (p.memberTypes.some((m) => m.type === "child")) {
      const childEnabled =
        (step3?.familyCoverRecommended ?? false) &&
        (step4?.coverStructure?.child ?? 0) > 0;
      const childBand = nearestBand(
        Math.min(
          step4?.coverStructure?.child ?? 20000,
          20000,
          p.maxSumAssured
        ),
        bands
      );
      initial.child = {
        enabled: childEnabled,
        count: childEnabled ? 1 : 0,
        coverBand: childBand || fallbackBand,
      };
    }

    // Parents
    if (p.memberTypes.some((m) => m.type === "parent")) {
      initial.parent = { enabled: false, count: 0, coverBand: fallbackBand };
    }

    // Parents-in-law
    if (p.memberTypes.some((m) => m.type === "parent_in_law")) {
      initial.parent_in_law = {
        enabled: false,
        count: 0,
        coverBand: fallbackBand,
      };
    }

    // Extended
    if (p.memberTypes.some((m) => m.type === "extended")) {
      initial.extended = {
        enabled: false,
        count: 0,
        coverBand: fallbackBand,
      };
    }

    setCats(initial);
  }

  // ── Available optional add-ons (declared first — referenced by addOnTotal) ────

  const availableAddOns = useMemo((): AddOn[] => {
    if (!product) return [];
    const feats = product.features.map((f) => f.toLowerCase());
    return ALL_OPTIONAL_ADDONS.filter((addon) => {
      if (addon.id === "grocery_benefit")
        return !feats.some((f) => f.includes("grocery"));
      if (addon.id === "tombstone_benefit")
        return !feats.some((f) => f.includes("tombstone"));
      if (addon.id === "accidental_death")
        return product.accidentalDeathWaitingPeriodMonths !== 0;
      return true;
    });
  }, [product]);

  // Reset add-on toggles whenever the available add-ons change (product changes)
  useEffect(() => {
    setAddOnState(Object.fromEntries(availableAddOns.map((a) => [a.id, false])));
  }, [availableAddOns]);

  // ── Premium calculation ──────────────────────────────────────────────────────

  const premiumResult = useMemo(() => {
    if (!product || Object.keys(cats).length === 0) return null;
    const { mainSumAssured, members } = buildFamilyMembers(cats, mainMemberAge);
    return calculateFullPremium(product, mainMemberAge, mainSumAssured, members);
  }, [product, cats, mainMemberAge]);

  const addOnTotal = useMemo(
    () =>
      availableAddOns
        .filter((a) => addOnState[a.id])
        .reduce((sum, a) => sum + a.monthlyCost, 0),
    [availableAddOns, addOnState]
  );

  const totalPremium = (premiumResult?.total ?? 0) + addOnTotal;

  // ── Category mutators ────────────────────────────────────────────────────────

  function toggleCategory(type: MemberType) {
    setCats((prev) => {
      const cur = prev[type];
      if (!cur) return prev;
      const nowEnabled = !cur.enabled;
      return {
        ...prev,
        [type]: {
          ...cur,
          enabled: nowEnabled,
          count: nowEnabled ? Math.max(cur.count, 1) : 0,
        },
      };
    });
  }

  function setCoverBand(type: MemberType, band: number) {
    setCats((prev) => {
      const cur = prev[type];
      if (!cur) return prev;
      return { ...prev, [type]: { ...cur, coverBand: band } };
    });
  }

  function adjustCount(type: MemberType, delta: number) {
    setCats((prev) => {
      const cur = prev[type];
      if (!cur) return prev;
      const config = product?.memberTypes.find((m) => m.type === type);
      const max = config?.maxCount ?? 10;
      const newCount = Math.max(1, Math.min(cur.count + delta, max));
      return { ...prev, [type]: { ...cur, count: newCount, enabled: true } };
    });
  }

  // ── Beneficiary helpers ──────────────────────────────────────────────────────

  const totalBenePercent = beneficiaries.reduce((s, b) => s + b.percentage, 0);

  function handleAddBeneficiary() {
    const pct = parseFloat(beneForm.percentage);
    if (
      !beneForm.firstName.trim() ||
      !beneForm.lastName.trim() ||
      !beneForm.relationship.trim() ||
      isNaN(pct) ||
      pct <= 0 ||
      pct > 100
    ) {
      setBeneFormError("Please complete all fields. Percentage must be 1–100.");
      return;
    }
    if (totalBenePercent + pct > 100) {
      setBeneFormError(
        `Adding ${pct}% would exceed 100%. Remaining: ${100 - totalBenePercent}%.`
      );
      return;
    }
    setBeneFormError("");
    setBeneficiaries((prev) => [
      ...prev,
      {
        id: uuidv4(),
        firstName: beneForm.firstName.trim(),
        lastName: beneForm.lastName.trim(),
        relationship: beneForm.relationship.trim(),
        percentage: pct,
      },
    ]);
    setBeneForm({ ...DEFAULT_BENE });
    setShowBeneForm(false);
  }

  // ── Included benefits (from product features) ────────────────────────────────

  const includedBenefits = useMemo(() => {
    if (!product) return [];
    const feats = product.features.map((f) => f.toLowerCase());
    const result: { name: string; description: string }[] = [];
    if (feats.some((f) => f.includes("grocery")))
      result.push({
        name: "Grocery Benefit",
        description: "Food voucher paid on approved claim",
      });
    if (feats.some((f) => f.includes("tombstone")))
      result.push({
        name: "Tombstone Benefit",
        description: "Contribution towards tombstone costs",
      });
    if (feats.some((f) => f.includes("repatriation")))
      result.push({
        name: "Repatriation Benefit",
        description: "Transport of remains to place of burial",
      });
    if (product.accidentalDeathWaitingPeriodMonths === 0)
      result.push({
        name: "Immediate Accidental Death Cover",
        description: "Accidental death claims paid from day 1",
      });
    return result;
  }, [product]);

  // ── Affordability status ─────────────────────────────────────────────────────

  const affordabilityResult = useMemo<AffordabilityResult>(
    () => checkAffordability(totalPremium, affordabilityMin, affordabilityMax),
    [totalPremium, affordabilityMin, affordabilityMax]
  );

  // Map service status → legacy local key used by StickyPremiumPanel pill
  const affordabilityStatus = useMemo(() => {
    switch (affordabilityResult.status) {
      case "within_range":     return "within"     as const;
      case "below_minimum":    return "low"        as const;
      case "slightly_above_range": return "slightly" as const;
      case "materially_above_range": return "materially" as const;
      default:                 return "unknown"    as const;
    }
  }, [affordabilityResult.status]);

  const affordabilityBarPct = useMemo(
    () => getGaugePosition(totalPremium, affordabilityMax),
    [totalPremium, affordabilityMax]
  );

  // ── Submit ───────────────────────────────────────────────────────────────────

  function handleComplete() {
    const errs: string[] = [];
    if (!product) errs.push("No product loaded.");
    if (beneficiaries.length === 0)
      errs.push("At least one beneficiary is required.");
    if (totalBenePercent !== 100)
      errs.push(
        `Beneficiary percentages must total 100%. Current: ${totalBenePercent}%.`
      );
    setErrors(errs);
    if (errs.length > 0 || !premiumResult || !product) return;

    const { mainSumAssured, members } = buildFamilyMembers(cats, mainMemberAge);
    const activeAddOns = availableAddOns.filter((a) => addOnState[a.id]);

    const premiumBreakdown = {
      mainMemberPremium: premiumResult.mainMemberPremium,
      memberPremiums: [
        ...premiumResult.memberBreakdown.map((m) => ({
          memberId: m.memberId,
          name: m.name,
          premium: m.premium,
        })),
        ...activeAddOns.map((a) => ({
          memberId: `addon-${a.id}`,
          name: a.name,
          premium: a.monthlyCost,
        })),
      ],
      adminFee: premiumResult.adminFee,
      total: totalPremium,
    };

    // ── Structured summary fields for Steps 6 / 7 / 9 ────────────────────────

    const PRODUCT_CATEGORY_MAP: Record<string, string> = {
      basic: "individual_funeral_cover",
      standard: "family_funeral_cover",
      premium: "extended_family_funeral_cover",
      elite: "comprehensive_funeral_cover",
    };

    const coveredMembers = {
      mainMember: true,
      spouse: cats.spouse?.enabled ?? false,
      children: cats.child?.enabled ? (cats.child.count ?? 0) : 0,
      parents: cats.parent?.enabled ? (cats.parent.count ?? 0) : 0,
      parentInLaw: cats.parent_in_law?.enabled
        ? (cats.parent_in_law.count ?? 0)
        : 0,
      extendedFamily: cats.extended?.enabled ? (cats.extended.count ?? 0) : 0,
    };

    const coverAmounts = {
      mainMember: cats.main?.coverBand ?? 0,
      spouse: cats.spouse?.enabled ? (cats.spouse.coverBand ?? 0) : 0,
      child: cats.child?.enabled ? (cats.child.coverBand ?? 0) : 0,
      parent: cats.parent?.enabled ? (cats.parent.coverBand ?? 0) : 0,
      parentInLaw: cats.parent_in_law?.enabled
        ? (cats.parent_in_law.coverBand ?? 0)
        : 0,
      extendedFamily: cats.extended?.enabled ? (cats.extended.coverBand ?? 0) : 0,
    };

    const feats = product.features.map((f) => f.toLowerCase());
    const optionalBenefits = {
      // True if bundled in product OR selected as an add-on
      groceryBenefit:
        feats.some((f) => f.includes("grocery")) ||
        (addOnState["grocery_benefit"] ?? false),
      tombstoneBenefit:
        feats.some((f) => f.includes("tombstone")) ||
        (addOnState["tombstone_benefit"] ?? false),
      repatriationBenefit: feats.some((f) => f.includes("repatriation")),
      accidentalDeathImmediateCover:
        product.accidentalDeathWaitingPeriodMonths === 0 ||
        (addOnState["accidental_death"] ?? false),
      premiumWaiver: addOnState["premium_waiver"] ?? false,
      familyIncomeSupport: false,
    };

    // Map affordability-check.ts status to the stored enum
    const afStatus =
      affordabilityResult.status === "within_range" || affordabilityResult.status === "below_minimum"
        ? ("within_range" as const)
        : affordabilityResult.status === "slightly_above_range"
        ? ("slightly_above_range" as const)
        : affordabilityResult.status === "materially_above_range"
        ? ("above_range" as const)
        : ("unknown" as const);

    const configWarnings: string[] = [];
    if (step2?.client?.hasTerminalIllness) {
      configWarnings.push(
        "Health declaration: Client indicated a terminal illness or serious condition. Confirm underwriting acceptance with the insurer."
      );
    }
    if (mainMemberAge >= 60) {
      configWarnings.push(
        `Senior client (age ${mainMemberAge}): Verify age-based eligibility with the insurer before submitting.`
      );
    }
    if ((step3?.existingCoverTotal ?? 0) > 0) {
      configWarnings.push(
        "Existing funeral cover was declared. Verify that additional cover is still required to avoid unnecessary duplication."
      );
    }
    if (affordabilityResult.requiresAdviserNote && affordabilityResult.status !== "unknown") {
      configWarnings.push(affordabilityResult.message);
    }

    // ── Compliance / audit trail ──────────────────────────────────────────────
    // Captures what was recommended vs what the client elected, for ROA narrative.

    const recommendedPremium = step4?.estimatedMonthlyPremium ?? 0;
    const originalRecommendation = step4?.coverStructure
      ? {
          mainMember: step4.coverStructure.mainMember,
          spouse: step4.coverStructure.spouse,
          child: step4.coverStructure.child,
          estimatedMonthlyPremium: recommendedPremium,
        }
      : undefined;

    const coverChangedFromRecommendation =
      recommendedPremium > 0 && totalPremium !== recommendedPremium;
    const coverIncreased =
      recommendedPremium > 0 && totalPremium > recommendedPremium;
    const coverDecreased =
      recommendedPremium > 0 && totalPremium < recommendedPremium;
    const affordabilityWarningTriggered = affordabilityResult.requiresAdviserNote;
    const duplicationWarningShown =
      (step3?.existingCoverConsidered ?? false) &&
      (step3?.existingCoverTotal ?? 0) > 0;

    saveStep5({
      sumAssured: mainSumAssured,
      monthlyPremium: totalPremium,
      members,
      beneficiaries,
      premiumBreakdown,
      addOns: activeAddOns.map((a) => ({
        id: a.id,
        name: a.name,
        monthlyPremium: a.monthlyCost,
      })),
      // Structured summary
      productCategory: PRODUCT_CATEGORY_MAP[product.tier] ?? "funeral_cover",
      coveredMembers,
      coverAmounts,
      optionalBenefits,
      affordabilityStatus: afStatus,
      configurationWarnings: configWarnings,
      // Compliance trail
      originalRecommendation,
      coverChangedFromRecommendation,
      coverIncreased,
      coverDecreased,
      affordabilityWarningTriggered,
      duplicationWarningShown,
      completedAt: new Date().toISOString(),
    });
    toast.success("Policy configuration saved.");
    onComplete();
  }

  // ── Render guards ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        <p className="text-sm text-gray-500">Loading product configuration…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-500">
          No product selected. Please go back and select a product.
        </p>
      </div>
    );
  }

  const bands = getBandsForProduct(product);
  const nonMainTypes: MemberType[] = [
    "spouse",
    "child",
    "parent",
    "parent_in_law",
    "extended",
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Adjust Your Cover
        </h2>
        <p className="text-sm text-gray-500">
          You can review the recommended cover and make changes to suit your
          family and monthly budget.
        </p>
        <p className="text-xs text-gray-400 mt-1">
          We&apos;ll let you know if changes may push the premium above the
          recommended range.
        </p>
      </div>

      {/* ── Sticky premium summary panel ── */}
      <StickyPremiumPanel
        totalPremium={totalPremium}
        affordabilityStatus={affordabilityStatus}
        cats={cats}
        mainFirstName={mainFirstName}
        mainLastName={mainLastName}
        includedBenefits={includedBenefits}
        addOnState={addOnState}
        availableAddOns={availableAddOns}
      />

      {/* ── Rule notices ── */}
      <RuleNotices
        mainMemberAge={mainMemberAge}
        hasTerminalIllness={step2?.client?.hasTerminalIllness ?? false}
        existingCoverTotal={step3?.existingCoverTotal ?? 0}
        existingCoverConsidered={step3?.existingCoverConsidered ?? false}
      />

      {/* Product context banner */}
      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-green-800">{product.name}</span>
          <span className="text-xs rounded-full bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 capitalize">
            {product.tier}
          </span>
        </div>
        <div className="text-gray-600">
          Insurer:{" "}
          <strong className="text-gray-900">{product.insurer}</strong>
        </div>
        <div className="text-gray-600">
          Cover:{" "}
          <strong className="text-gray-900">
            {formatZAR(product.minSumAssured, { showDecimals: false })} –{" "}
            {formatZAR(product.maxSumAssured, { showDecimals: false })}
          </strong>
        </div>
        <div className="text-gray-600">
          Waiting period:{" "}
          <strong className="text-gray-900">
            {product.waitingPeriodMonths} months
          </strong>
        </div>
      </div>

      {/* ── Section 1: Who Is Covered ── */}
      <section>
        <SectionTitle>Who Is Covered?</SectionTitle>
        <div className="flex flex-col gap-3">
          {/* Main member card (always on) */}
          {cats.main && (
            <CategoryCard
              type="main"
              cat={cats.main}
              isMain
              mainName={`${mainFirstName} ${mainLastName}`}
              bands={bands}
              maxCount={1}
              onToggle={() => {}}
              onCoverBand={(b) => setCoverBand("main", b)}
              onAdjustCount={() => {}}
            />
          )}

          {/* Non-main member categories */}
          {nonMainTypes.map((type) => {
            const cat = cats[type];
            if (!cat) return null;
            const config = product.memberTypes.find((m) => m.type === type);
            if (!config) return null;
            return (
              <CategoryCard
                key={type}
                type={type}
                cat={cat}
                isMain={false}
                bands={bands}
                maxCount={config.maxCount}
                onToggle={() => toggleCategory(type)}
                onCoverBand={(b) => setCoverBand(type, b)}
                onAdjustCount={(d) => adjustCount(type, d)}
              />
            );
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3 italic">
          Ages shown are for premium illustration only. Final eligibility is
          subject to the insurer&apos;s underwriting requirements.
        </p>
      </section>

      {/* ── Section 2: Benefits ── */}
      <section>
        <SectionTitle>Benefits</SectionTitle>

        {/* Included benefits */}
        {includedBenefits.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Included with this product
            </p>
            <div className="flex flex-col gap-2">
              {includedBenefits.map((b) => (
                <div
                  key={b.name}
                  className="flex items-center gap-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2.5"
                >
                  <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800">
                      {b.name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {b.description}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex-shrink-0">
                    Included
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Optional add-ons — only shows benefits not already bundled */}
        {availableAddOns.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Optional add-ons
          </p>
          <div className="flex flex-col gap-2">
            {availableAddOns.map((addon) => (
              <div
                key={addon.id}
                className={`rounded-xl border px-4 py-3 transition-all ${
                  addOnState[addon.id]
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setAddOnState((prev) => ({
                        ...prev,
                        [addon.id]: !prev[addon.id],
                      }))
                    }
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                      addOnState[addon.id]
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300 bg-white"
                    }`}
                  >
                    {addOnState[addon.id] && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {addon.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {addon.description}
                    </p>
                  </div>
                  <p
                    className={`text-sm font-bold flex-shrink-0 ${
                      addOnState[addon.id]
                        ? "text-blue-700"
                        : "text-gray-500"
                    }`}
                  >
                    +{formatZAR(addon.monthlyCost)}/mo
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}
      </section>

      {/* ── Section 3: Affordability Check ── */}
      {affordabilityMax > 0 && (
        <section>
          <SectionTitle>Affordability Check</SectionTitle>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-end justify-between text-xs text-gray-500 mb-2">
              <div>
                <p className="font-medium text-gray-700">Min recommended</p>
                <p>{formatZAR(affordabilityMin)}/mo</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-700">Max recommended</p>
                <p>{formatZAR(affordabilityMax)}/mo</p>
              </div>
            </div>

            {/* Gauge bar */}
            <div className="relative h-3 rounded-full bg-gray-100 overflow-hidden mb-3">
              {/* Green recommended range band */}
              {(() => {
                const { left, width } = getGaugeSafeZone(affordabilityMin, affordabilityMax);
                return (
                  <div
                    className="absolute top-0 h-full bg-green-100 rounded-full"
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                );
              })()}
              {/* Premium position indicator */}
              <div
                className={`absolute top-0 h-full w-2 rounded-full transition-all duration-300 ${
                  affordabilityStatus === "within" || affordabilityStatus === "low"
                    ? "bg-green-500"
                    : affordabilityStatus === "slightly"
                    ? "bg-amber-500"
                    : affordabilityStatus === "materially"
                    ? "bg-red-500"
                    : "bg-blue-400"
                }`}
                style={{
                  left: `${Math.min(affordabilityBarPct, 97)}%`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>

            {/* Status message — driven by affordability-check.ts */}
            <div
              className={`flex items-start gap-2 text-sm font-medium rounded-lg px-3 py-2.5 ${affordabilityResult.colours.bg} ${affordabilityResult.colours.text}`}
            >
              {(affordabilityResult.status === "within_range" || affordabilityResult.status === "below_minimum") ? (
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <span>{affordabilityResult.message}</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Section 4: Premium Summary ── */}
      {premiumResult && (
        <section>
          <SectionTitle>Premium Summary</SectionTitle>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <tbody>
                {/* Main member */}
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2.5 text-gray-700 font-medium">
                    {mainFirstName} {mainLastName}
                  </td>
                  <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                    {formatZAR(cats.main?.coverBand ?? 0, {
                      showDecimals: false,
                    })}{" "}
                    cover
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900 w-24">
                    {formatZAR(premiumResult.mainMemberPremium)}
                  </td>
                </tr>

                {/* Additional member categories */}
                {nonMainTypes.map((type) => {
                  const cat = cats[type];
                  if (!cat?.enabled) return null;
                  const typePremium = premiumResult.memberBreakdown
                    .filter((m) => m.type === type)
                    .reduce((sum, m) => sum + m.premium, 0);
                  return (
                    <tr key={type} className="border-b border-gray-100">
                      <td className="px-4 py-2.5 text-gray-600">
                        {MEMBER_LABELS[type]}
                        {cat.count > 1 && (
                          <span className="text-xs text-gray-400 ml-1">
                            ×{cat.count}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                        {formatZAR(cat.coverBand, { showDecimals: false })} each
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 w-24">
                        {formatZAR(typePremium)}
                      </td>
                    </tr>
                  );
                })}

                {/* Optional add-ons */}
                {availableAddOns.filter((a) => addOnState[a.id]).map(
                  (addon: AddOn) => (
                    <tr key={addon.id} className="border-b border-gray-100">
                      <td
                        className="px-4 py-2.5 text-gray-600"
                        colSpan={2}
                      >
                        {addon.name}
                        <span className="text-xs text-blue-600 ml-1.5 font-medium">
                          Add-on
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900 w-24">
                        {formatZAR(addon.monthlyCost)}
                      </td>
                    </tr>
                  )
                )}

                {/* Admin fee */}
                <tr className="border-b border-gray-100 bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-500" colSpan={2}>
                    Administration Fee
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-700 w-24">
                    {formatZAR(premiumResult.adminFee)}
                  </td>
                </tr>

                {/* Total */}
                <tr className="bg-green-50 border-t-2 border-green-200">
                  <td
                    className="px-4 py-3 font-bold text-gray-900"
                    colSpan={2}
                  >
                    Total Monthly Premium
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-extrabold text-green-700 w-24">
                    {formatZAR(totalPremium)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-2 italic">
            Premiums are estimated based on representative ages and selected
            cover amounts. Final premiums are subject to underwriting.
          </p>
        </section>
      )}

      {/* ── Section 5: Beneficiaries ── */}
      <section>
        <div className="flex items-center justify-between mb-4 border-b border-gray-200 pb-2">
          <h3 className="text-base font-semibold text-gray-800">
            Beneficiaries
          </h3>
          <span
            className={`text-sm font-medium ${
              totalBenePercent === 100
                ? "text-green-600"
                : totalBenePercent > 100
                ? "text-red-600"
                : "text-gray-500"
            }`}
          >
            {totalBenePercent}% of 100%
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {beneficiaries.length === 0 && (
            <p className="text-sm text-gray-400 italic">
              No beneficiaries added. At least one is required.
            </p>
          )}

          {beneficiaries.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-gray-200 bg-white p-4 flex items-center justify-between gap-4 flex-wrap"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {b.firstName} {b.lastName}
                </p>
                <p className="text-xs text-gray-500">
                  {b.relationship} — {b.percentage}%
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setBeneficiaries((prev) => prev.filter((x) => x.id !== b.id))
                }
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          {showBeneForm && (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-4 flex flex-col gap-3">
              <h4 className="text-sm font-semibold text-gray-700">
                Add Beneficiary
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={beneForm.firstName}
                    onChange={(e) =>
                      setBeneForm((p) => ({ ...p, firstName: e.target.value }))
                    }
                    placeholder="First name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={beneForm.lastName}
                    onChange={(e) =>
                      setBeneForm((p) => ({ ...p, lastName: e.target.value }))
                    }
                    placeholder="Last name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Relationship
                  </label>
                  <input
                    type="text"
                    value={beneForm.relationship}
                    onChange={(e) =>
                      setBeneForm((p) => ({
                        ...p,
                        relationship: e.target.value,
                      }))
                    }
                    placeholder="e.g. Spouse, Child"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">
                    Percentage (%)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={beneForm.percentage}
                    onChange={(e) =>
                      setBeneForm((p) => ({ ...p, percentage: e.target.value }))
                    }
                    placeholder={`Remaining: ${100 - totalBenePercent}%`}
                    className={inputClass}
                  />
                </div>
              </div>
              {beneFormError && (
                <p className="text-xs text-red-600">{beneFormError}</p>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleAddBeneficiary}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Add Beneficiary
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBeneForm(false);
                    setBeneForm({ ...DEFAULT_BENE });
                    setBeneFormError("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!showBeneForm && totalBenePercent < 100 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowBeneForm(true)}
              className="self-start flex items-center gap-2 text-green-700 border-green-300 hover:bg-green-50"
            >
              <PlusCircle className="w-4 h-4" />
              Add Beneficiary
            </Button>
          )}
        </div>
      </section>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-2">
          {errors.map((e, i) => (
            <div
              key={i}
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3"
            >
              <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{e}</p>
            </div>
          ))}
        </div>
      )}

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

// ─── StickyPremiumPanel ───────────────────────────────────────────────────────

type LocalAffordabilityStatus = "within" | "low" | "slightly" | "materially" | "unknown";

interface StickyPremiumPanelProps {
  totalPremium: number;
  affordabilityStatus: LocalAffordabilityStatus;
  cats: Partial<Record<MemberType, CategoryState>>;
  mainFirstName: string;
  mainLastName: string;
  includedBenefits: { name: string }[];
  addOnState: Record<string, boolean>;
  availableAddOns: AddOn[];
}

const AFFORDABILITY_PILL: Record<
  LocalAffordabilityStatus,
  { label: string; cls: string }
> = {
  within: { label: "Within recommended range", cls: "bg-green-100 text-green-700" },
  low: { label: "Within recommended range", cls: "bg-green-100 text-green-700" },
  slightly: { label: "Slightly above range", cls: "bg-amber-100 text-amber-700" },
  materially: { label: "Above recommended range", cls: "bg-red-100 text-red-700" },
  unknown: { label: "Affordability unknown", cls: "bg-gray-100 text-gray-600" },
};

function StickyPremiumPanel({
  totalPremium,
  affordabilityStatus,
  cats,
  mainFirstName,
  mainLastName,
  includedBenefits,
  addOnState,
  availableAddOns,
}: StickyPremiumPanelProps) {
  const pill = AFFORDABILITY_PILL[affordabilityStatus];
  const mainName = `${mainFirstName} ${mainLastName}`.trim();
  const people = describePeopleCovered(cats, mainName);
  const benefits = describeSelectedBenefits(includedBenefits, addOnState, availableAddOns);

  return (
    <div className="sticky top-2 z-20 rounded-xl border border-gray-200 bg-white shadow-md overflow-hidden">
      {/* Premium row */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Estimated Monthly Premium
          </p>
          <p className="text-2xl font-extrabold text-gray-900 leading-tight">
            {formatZAR(totalPremium)}
            <span className="text-sm font-medium text-gray-400 ml-1">/month</span>
          </p>
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${pill.cls}`}>
          {pill.label}
        </span>
      </div>

      {/* Summary rows */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 px-4 py-3 text-sm">
        <div className="flex items-start gap-2 py-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap mt-0.5 w-28 flex-shrink-0">
            People covered
          </span>
          <span className="text-gray-700">{people}</span>
        </div>
        <div className="flex items-start gap-2 py-1">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap mt-0.5 w-28 flex-shrink-0">
            Benefits
          </span>
          <span className="text-gray-700">{benefits}</span>
        </div>
      </div>
    </div>
  );
}

// ─── RuleNotices ──────────────────────────────────────────────────────────────

interface RuleNoticesProps {
  mainMemberAge: number;
  hasTerminalIllness: boolean;
  existingCoverTotal: number;
  existingCoverConsidered: boolean;
}

function RuleNotices({
  mainMemberAge,
  hasTerminalIllness,
  existingCoverTotal,
  existingCoverConsidered,
}: RuleNoticesProps) {
  const notices: { type: "warn" | "info"; text: string }[] = [];

  // Rule 4: Health declaration carry-through
  if (hasTerminalIllness) {
    notices.push({
      type: "warn",
      text: "Health declaration: The client indicated a terminal illness or serious condition. This may affect underwriting acceptance. Confirm eligibility with the insurer before proceeding.",
    });
  }

  // Rule 5: Senior age eligibility note
  if (mainMemberAge >= 60) {
    notices.push({
      type: "warn",
      text: `Senior client (age ${mainMemberAge}): Some products have age-based entry limits for the main member and additional members. Please verify eligibility with the insurer.`,
    });
  }

  // Rule 6: Existing cover duplication reminder
  if (existingCoverConsidered && existingCoverTotal > 0) {
    notices.push({
      type: "info",
      text: `Existing cover of ${formatZAR(existingCoverTotal, { showDecimals: false })} was declared. Ensure the additional cover being configured is still required to avoid unnecessary duplication of benefits.`,
    });
  }

  if (notices.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {notices.map((n, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            n.type === "warn"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-blue-200 bg-blue-50 text-blue-800"
          }`}
        >
          <AlertTriangle
            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
              n.type === "warn" ? "text-amber-500" : "text-blue-500"
            }`}
          />
          <p>{n.text}</p>
        </div>
      ))}
    </div>
  );
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

interface CategoryCardProps {
  type: MemberType;
  cat: CategoryState;
  isMain: boolean;
  mainName?: string;
  bands: number[];
  maxCount: number;
  onToggle: () => void;
  onCoverBand: (band: number) => void;
  onAdjustCount: (delta: number) => void;
}

function CategoryCard({
  type,
  cat,
  isMain,
  mainName,
  bands,
  maxCount,
  onToggle,
  onCoverBand,
  onAdjustCount,
}: CategoryCardProps) {
  const isMulti = maxCount > 1;
  const repAgeLabel = REP_AGE_LABELS[type];

  return (
    <div
      className={`rounded-xl border transition-all ${
        cat.enabled
          ? "border-green-300 bg-white shadow-sm"
          : "border-gray-200 bg-gray-50"
      }`}
    >
      {/* Card header row */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {/* Checkbox toggle */}
        {isMain ? (
          <div className="w-5 h-5 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center flex-shrink-0">
            <Check className="w-3 h-3 text-white" />
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              cat.enabled
                ? "border-green-500 bg-green-500"
                : "border-gray-300 bg-white hover:border-gray-400"
            }`}
          >
            {cat.enabled && <Check className="w-3 h-3 text-white" />}
          </button>
        )}

        {/* Label + description */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold ${
              cat.enabled ? "text-gray-900" : "text-gray-400"
            }`}
          >
            {isMain && mainName ? `${MEMBER_LABELS[type]} — ${mainName}` : MEMBER_LABELS[type]}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              cat.enabled ? "text-gray-500" : "text-gray-300"
            }`}
          >
            {MEMBER_DESCRIPTIONS[type]}
          </p>
        </div>

        {/* Count selector (multi-member types when enabled) */}
        {isMulti && cat.enabled && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => onAdjustCount(-1)}
              disabled={cat.count <= 1}
              className="w-7 h-7 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-bold text-gray-800 w-4 text-center">
              {cat.count}
            </span>
            <button
              type="button"
              onClick={() => onAdjustCount(1)}
              disabled={cat.count >= maxCount}
              className="w-7 h-7 rounded-full border border-gray-300 bg-white flex items-center justify-center text-gray-600 hover:border-gray-400 disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Cover band selector — shown when enabled */}
      {cat.enabled && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap w-28">
              Cover amount
            </label>
            <select
              value={cat.coverBand}
              onChange={(e) => onCoverBand(Number(e.target.value))}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
            >
              {bands.map((b) => (
                <option key={b} value={b}>
                  {formatZAR(b, { showDecimals: false })}
                </option>
              ))}
            </select>
            {isMulti && cat.count > 1 && (
              <span className="text-xs text-gray-400 whitespace-nowrap">
                per person
              </span>
            )}
          </div>
          {repAgeLabel && !isMain && (
            <p className="text-xs text-gray-400 italic">{repAgeLabel}</p>
          )}
        </div>
      )}
    </div>
  );
}
