import { FuneralCostBreakdown, CostCategory } from "@/types/calculator.types";

const CONTINGENCY_BUFFER = 1.15; // 15% buffer
const ROUNDING_STEP = 2500; // Round to nearest R2,500
const MIN_COVER = 5000;
const MAX_COVER = 100000;

export function roundToStep(value: number, step: number): number {
  return Math.ceil(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function calculateCostTotal(
  breakdown: Omit<FuneralCostBreakdown, "total" | "recommendedCover">
): number {
  return Object.values(breakdown).reduce((sum, val) => sum + (val || 0), 0);
}

export function calculateRecommendedCover(total: number): number {
  const withBuffer = total * CONTINGENCY_BUFFER;
  const rounded = roundToStep(withBuffer, ROUNDING_STEP);
  return clamp(rounded, MIN_COVER, MAX_COVER);
}

export function buildCostBreakdown(
  items: Omit<FuneralCostBreakdown, "total" | "recommendedCover">
): FuneralCostBreakdown {
  const total = calculateCostTotal(items);
  const recommendedCover = calculateRecommendedCover(total);
  return { ...items, total, recommendedCover };
}

/** Affordability thresholds per FAIS guidance and industry norms */
const AFFORDABILITY_MIN_PCT = 0.02; // 2% of income = comfortable lower bound
const AFFORDABILITY_MAX_PCT = 0.05; // 5% of income = upper sustainable limit
const AFFORDABILITY_WARN_PCT = 0.08; // 8% = caution zone
const AFFORDABILITY_HARD_WARN_PCT = 0.12; // 12%+ = strong warning

export interface AffordabilityRange {
  minPremium: number;
  maxPremium: number;
  monthlyIncome: number;
  incomeBracketLabel: string;
}

/**
 * Calculate the affordable premium range for a given monthly income.
 * Industry guidance: premiums should be 2–5% of gross monthly income.
 */
export function calculateAffordabilityRange(
  monthlyIncome: number,
  incomeBracketLabel: string
): AffordabilityRange {
  return {
    minPremium: Math.round(monthlyIncome * AFFORDABILITY_MIN_PCT),
    maxPremium: Math.round(monthlyIncome * AFFORDABILITY_MAX_PCT),
    monthlyIncome,
    incomeBracketLabel,
  };
}

export type AffordabilityStatus = "comfortable" | "moderate" | "caution" | "warning";

export function getAffordabilityStatus(
  premium: number,
  monthlyIncome: number
): AffordabilityStatus {
  if (monthlyIncome <= 0) return "comfortable";
  const ratio = premium / monthlyIncome;
  if (ratio <= AFFORDABILITY_MAX_PCT) return "comfortable";
  if (ratio <= AFFORDABILITY_WARN_PCT) return "moderate";
  if (ratio <= AFFORDABILITY_HARD_WARN_PCT) return "caution";
  return "warning";
}

export interface NeedsAnalysisResult {
  totalFuneralCost: number;
  existingCoverTotal: number;
  cashSavings: number;
  coverShortfall: number;
  recommendedCover: number;
  affordabilityRatio: number;
  affordabilityRange: AffordabilityRange;
  affordabilityStatus: AffordabilityStatus;
  isAffordable: boolean;
  familyCoverRecommended: boolean;
  warnings: string[];
}

export function calculateNeedsAnalysis(params: {
  totalFuneralCost: number;
  existingCoverTotal: number;
  cashSavings: number;
  monthlyIncome: number;
  incomeBracketLabel?: string;
  estimatedMonthlyPremium?: number;
  hasSpouseOrPartner?: boolean;
  existingMemberCount?: number;
}): NeedsAnalysisResult {
  const {
    totalFuneralCost,
    existingCoverTotal,
    cashSavings,
    monthlyIncome,
    incomeBracketLabel = "",
    estimatedMonthlyPremium = 0,
    hasSpouseOrPartner = false,
    existingMemberCount = 0,
  } = params;

  const coverShortfall = Math.max(
    0,
    totalFuneralCost - existingCoverTotal - cashSavings
  );
  const recommendedCover = calculateRecommendedCover(
    coverShortfall || totalFuneralCost
  );

  const affordabilityRatio =
    monthlyIncome > 0
      ? (estimatedMonthlyPremium / monthlyIncome) * 100
      : 0;

  const affordabilityRange = calculateAffordabilityRange(
    monthlyIncome,
    incomeBracketLabel
  );

  const affordabilityStatus = getAffordabilityStatus(
    estimatedMonthlyPremium || affordabilityRange.minPremium,
    monthlyIncome
  );

  // Recommend family cover if married/partnered or has existing dependants
  const familyCoverRecommended = hasSpouseOrPartner || existingMemberCount > 0;

  const warnings: string[] = [];

  if (affordabilityStatus === "warning") {
    warnings.push(
      "The estimated premium exceeds 12% of the client's monthly income. Consider reducing the sum assured or reviewing affordability."
    );
  } else if (affordabilityStatus === "caution") {
    warnings.push(
      "The estimated premium is between 8–12% of monthly income. Please confirm this is sustainable for the client long-term."
    );
  }

  if (totalFuneralCost > MAX_COVER) {
    warnings.push(
      `The estimated funeral cost (R${totalFuneralCost.toLocaleString()}) exceeds the maximum available cover of R${MAX_COVER.toLocaleString()}. Additional savings may be required.`
    );
  }

  return {
    totalFuneralCost,
    existingCoverTotal,
    cashSavings,
    coverShortfall,
    recommendedCover,
    affordabilityRatio,
    affordabilityRange,
    affordabilityStatus,
    isAffordable: affordabilityStatus === "comfortable" || affordabilityStatus === "moderate",
    familyCoverRecommended,
    warnings,
  };
}

export const DEFAULT_COST_ITEMS: Record<
  CostCategory,
  {
    label: string;
    description: string;
    defaultAmount: number;
    minAmount: number;
    maxAmount: number;
    step: number;
    isOptional: boolean;
    isCultural: boolean;
  }
> = {
  food: {
    label: "Food & Catering",
    description: "Feeding mourners during the funeral and at home",
    defaultAmount: 8000,
    minAmount: 0,
    maxAmount: 30000,
    step: 500,
    isOptional: false,
    isCultural: false,
  },
  tents: {
    label: "Tents & Chairs",
    description: "Tent hire, chairs, and related equipment",
    defaultAmount: 5500,
    minAmount: 0,
    maxAmount: 20000,
    step: 500,
    isOptional: false,
    isCultural: false,
  },
  transport: {
    label: "Transport",
    description: "Hearse and family transport to and from the funeral",
    defaultAmount: 4000,
    minAmount: 0,
    maxAmount: 15000,
    step: 500,
    isOptional: false,
    isCultural: false,
  },
  livestock: {
    label: "Livestock",
    description: "Traditional slaughter of cattle, goats or sheep",
    defaultAmount: 6000,
    minAmount: 0,
    maxAmount: 30000,
    step: 1000,
    isOptional: true,
    isCultural: true,
  },
  vigil: {
    label: "Night Vigil (Ililo)",
    description: "Candles, food, music and venue for overnight vigil",
    defaultAmount: 3000,
    minAmount: 0,
    maxAmount: 10000,
    step: 500,
    isOptional: true,
    isCultural: true,
  },
  burial: {
    label: "Burial / Cremation",
    description: "Grave opening, burial rights, or cremation costs",
    defaultAmount: 6000,
    minAmount: 0,
    maxAmount: 20000,
    step: 500,
    isOptional: false,
    isCultural: false,
  },
  headstone: {
    label: "Headstone / Tombstone",
    description: "Monument, engraving, and unveiling ceremony",
    defaultAmount: 8000,
    minAmount: 0,
    maxAmount: 25000,
    step: 500,
    isOptional: false,
    isCultural: false,
  },
  funeral_parlour: {
    label: "Funeral Parlour",
    description: "Coffin, embalming, chapel hire, and mortuary services",
    defaultAmount: 10000,
    minAmount: 0,
    maxAmount: 40000,
    step: 500,
    isOptional: false,
    isCultural: false,
  },
  programme: {
    label: "Funeral Programme",
    description: "Printing of order of service and photographs",
    defaultAmount: 1500,
    minAmount: 0,
    maxAmount: 5000,
    step: 250,
    isOptional: false,
    isCultural: false,
  },
  clothing: {
    label: "Burial Clothing",
    description: "Clothing for the deceased and family mourning attire",
    defaultAmount: 2000,
    minAmount: 0,
    maxAmount: 10000,
    step: 500,
    isOptional: false,
    isCultural: false,
  },
  miscellaneous: {
    label: "Miscellaneous",
    description: "Other costs: flowers, cards, admin, unexpected expenses",
    defaultAmount: 2000,
    minAmount: 0,
    maxAmount: 10000,
    step: 500,
    isOptional: false,
    isCultural: false,
  },
};
