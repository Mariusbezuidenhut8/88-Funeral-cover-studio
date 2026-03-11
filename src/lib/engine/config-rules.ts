/**
 * config-rules.ts
 *
 * Composable rule functions for Step 5 (Configuration).
 *
 * These are pure functions — no React, no side effects.
 * The UI calls them to decide which controls to show, disable, or annotate.
 *
 * Design approach:
 *   Rules are derived from the Product object (which already encodes which
 *   member types are supported, age limits, and max counts).  The functions
 *   here translate product data + client profile into a UI-friendly shape
 *   that the Step 5 component can consume without needing to understand the
 *   product schema.
 */

import { Product, MemberType, ProductTier } from "@/types/product.types";

// ─── Client profile (subset of what Step 2 / 3 collect) ──────────────────────

export interface ClientProfile {
  age: number;
  maritalStatus: "single" | "married" | "divorced" | "widowed" | "living-with-partner";
  hasChildren: boolean;
  hasTerminalIllness: boolean;
  existingCoverTotal: number;
}

// ─── Return types ─────────────────────────────────────────────────────────────

/** Describes whether a member type toggle should be shown, enabled, and why. */
export interface MemberTypeRule {
  type: MemberType;
  shown: boolean;          // render the category card at all
  enabled: boolean;        // can the user toggle it on?
  disabledReason: string;  // shown as tooltip / inline hint when enabled=false
  maxCount: number;        // maximum number selectable
  minAge: number;
  maxAge: number;
}

/** All rules for one product + client combination. */
export interface ProductConfigRules {
  /** Rules per member type (only types the product has config for are included). */
  memberTypeRules: Partial<Record<MemberType, MemberTypeRule>>;

  /** Notices rendered at the top of Step 5 (non-blocking info / warnings). */
  notices: ConfigNotice[];

  /** Whether the entire configuration is valid enough to proceed. */
  isValid: boolean;

  /** Hard errors that block proceeding (e.g. client age outside all bands). */
  errors: string[];
}

export type NoticeLevel = "info" | "warn" | "error";

export interface ConfigNotice {
  level: NoticeLevel;
  message: string;
  /** Optional: which member type this notice is specific to */
  memberType?: MemberType;
}

// ─── Age loading table (matches spec exactly) ─────────────────────────────────
//
// Used by the UI to annotate premium estimates when the product's own premium
// band data is unavailable (e.g. products loaded lazily, or illustration mode).

export interface AgeLoading {
  minAge: number;
  maxAge: number; // Infinity for 70+
  loadingPct: number; // Additional percentage over the base rate
  label: string;
}

export const AGE_LOADINGS: AgeLoading[] = [
  { minAge: 0,  maxAge: 49, loadingPct: 0,  label: "Standard rate" },
  { minAge: 50, maxAge: 59, loadingPct: 15, label: "+15% age loading" },
  { minAge: 60, maxAge: 69, loadingPct: 30, label: "+30% age loading" },
  { minAge: 70, maxAge: Infinity, loadingPct: 50, label: "+50% age loading" },
];

export function getAgeLoading(age: number): AgeLoading {
  return (
    AGE_LOADINGS.find((l) => age >= l.minAge && age <= l.maxAge) ??
    AGE_LOADINGS[AGE_LOADINGS.length - 1]
  );
}

// ─── Placeholder premium rates (spec values — used for illustration only) ─────
//
// The production calculator in premium-calculator.ts uses product band data.
// These constants provide a fallback when product data is not yet loaded
// and are the canonical values from the Phase 2 spec.

export const PLACEHOLDER_RATES = {
  mainMemberRatePerThousand: 2.5,
  spouseMultiplier: 0.85,
  parentMultiplier: 1.2,
  childFlatRates: { 10000: 8, 20000: 12, 30000: 16 } as Record<number, number>,
  addOns: {
    grocery_benefit: 12,
    tombstone_benefit: 18,
    premium_waiver: 20,
    accidental_death: 15,
  } as Record<string, number>,
} as const;

/**
 * Lightweight placeholder calculation — use only when the full product object
 * is unavailable.  Step 5 should prefer `calculateFullPremium()` from
 * premium-calculator.ts once the product has loaded.
 */
export function calculatePlaceholderPremium(params: {
  mainMemberAge: number;
  mainCover: number;
  spouseCover?: number;
  childCover?: number;
  childCount?: number;
  parentCover?: number;
  parentCount?: number;
  extendedCover?: number;
  extendedCount?: number;
  selectedAddOnIds?: string[];
}): { total: number; breakdown: Record<string, number> } {
  const loading = getAgeLoading(params.mainMemberAge);
  const loadFactor = 1 + loading.loadingPct / 100;

  const baseMainRate = PLACEHOLDER_RATES.mainMemberRatePerThousand;
  const mainPremium = (params.mainCover / 1000) * baseMainRate * loadFactor;

  const spousePremium = params.spouseCover
    ? (params.spouseCover / 1000) * baseMainRate * PLACEHOLDER_RATES.spouseMultiplier * loadFactor
    : 0;

  let childPremium = 0;
  if (params.childCover && (params.childCount ?? 0) > 0) {
    const flatRate =
      PLACEHOLDER_RATES.childFlatRates[params.childCover] ??
      (params.childCover / 1000) * 0.8; // fallback flat rate
    childPremium = flatRate * (params.childCount ?? 1);
  }

  const parentPremium = params.parentCover && (params.parentCount ?? 0) > 0
    ? (params.parentCover / 1000) * baseMainRate * PLACEHOLDER_RATES.parentMultiplier * loadFactor * (params.parentCount ?? 1)
    : 0;

  const extendedPremium = params.extendedCover && (params.extendedCount ?? 0) > 0
    ? (params.extendedCover / 1000) * baseMainRate * loadFactor * (params.extendedCount ?? 1)
    : 0;

  const addOnTotal = (params.selectedAddOnIds ?? []).reduce(
    (sum, id) => sum + (PLACEHOLDER_RATES.addOns[id] ?? 0),
    0
  );

  const breakdown: Record<string, number> = {
    mainMember: mainPremium,
    spouse: spousePremium,
    children: childPremium,
    parents: parentPremium,
    extendedFamily: extendedPremium,
    addOns: addOnTotal,
  };

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);
  return { total, breakdown };
}

// ─── Member type rules ────────────────────────────────────────────────────────

/**
 * Build a MemberTypeRule for a single member type.
 * Encodes product support + client profile + any hard disqualification.
 */
function buildMemberTypeRule(
  product: Product,
  type: MemberType,
  profile: ClientProfile
): MemberTypeRule {
  const config = product.memberTypes.find((m) => m.type === type);

  // Product doesn't support this member type at all
  if (!config) {
    return {
      type,
      shown: false,
      enabled: false,
      disabledReason: `Not available on ${product.name}`,
      maxCount: 0,
      minAge: 0,
      maxAge: 0,
    };
  }

  // Age eligibility for main member propagates to senior notice; not blocking
  // for adding family members, so we check member-specific age limits separately.

  let enabled = true;
  let disabledReason = "";

  if (type === "spouse") {
    const hasPartner = ["married", "living-with-partner"].includes(profile.maritalStatus);
    if (!hasPartner) {
      enabled = false;
      disabledReason = "Only available if you are married or living with a partner.";
    }
  }

  if (type === "child" && !profile.hasChildren) {
    // Soft: we allow the user to enable it even if they said "no children" in Step 2,
    // since they may have forgotten or circumstances changed.
    // Return enabled=true but with a notice generated separately.
  }

  // Terminal illness: member categories that involve additional underwriting risk
  if (profile.hasTerminalIllness && (type === "parent" || type === "parent_in_law" || type === "extended")) {
    disabledReason =
      "Additional underwriting required — confirm eligibility with the insurer before adding extended members.";
    // Not disabling: the adviser may still add them with a warning in the ROA.
  }

  return {
    type,
    shown: true,
    enabled,
    disabledReason,
    maxCount: config.maxCount,
    minAge: config.minAge,
    maxAge: config.maxAge,
  };
}

// ─── Notices ──────────────────────────────────────────────────────────────────

function buildNotices(product: Product, profile: ClientProfile): ConfigNotice[] {
  const notices: ConfigNotice[] = [];

  // Senior notice
  if (profile.age >= 70) {
    notices.push({
      level: "warn",
      message:
        "Clients aged 70 and over attract a 50% age loading on the base premium rate. " +
        "Please ensure the monthly premium remains affordable and confirm entry age eligibility with the insurer.",
    });
  } else if (profile.age >= 60) {
    notices.push({
      level: "warn",
      message:
        `Clients aged 60–69 attract a 30% age loading. At age ${profile.age} the premium ` +
        "may be significantly higher than illustrated. Confirm eligibility with the insurer.",
    });
  } else if (profile.age >= 50) {
    notices.push({
      level: "info",
      message: "Clients aged 50–59 attract a 15% age loading on the base premium rate.",
    });
  }

  // Health declaration carry-through
  if (profile.hasTerminalIllness) {
    notices.push({
      level: "warn",
      message:
        "A terminal illness or serious health condition was declared in the fact find. " +
        "This policy is subject to underwriting acceptance. The insurer may impose conditions, " +
        "exclusions, or decline cover. Capture this in the Record of Advice.",
    });
  }

  // Existing cover duplication
  if (profile.existingCoverTotal > 0) {
    notices.push({
      level: "info",
      message:
        `Existing funeral cover of R${profile.existingCoverTotal.toLocaleString("en-ZA")} ` +
        "was declared. Ensure the additional cover configured here does not result in " +
        "unnecessary duplication of benefits.",
    });
  }

  // Product tier–specific notices
  const tierNotices = PRODUCT_TIER_NOTICES[product.tier];
  if (tierNotices) notices.push(...tierNotices);

  // Marital status / spouse toggle mismatch
  const supportsSpouse = product.memberTypes.some((m) => m.type === "spouse");
  const hasPartner = ["married", "living-with-partner"].includes(profile.maritalStatus);
  if (supportsSpouse && !hasPartner) {
    notices.push({
      level: "info",
      message:
        "The spouse / partner option is disabled because marital status was captured as " +
        `"${profile.maritalStatus}". If this is incorrect, please go back to Step 2 to update it.`,
      memberType: "spouse",
    });
  }

  return notices;
}

// Per-tier informational notices (static, product-tier–specific)
const PRODUCT_TIER_NOTICES: Partial<Record<ProductTier, ConfigNotice[]>> = {
  basic: [
    {
      level: "info",
      message:
        "SafeGuard Basic covers the main member, one spouse, and up to six children. " +
        "Parents and extended family members are not available on this product.",
    },
  ],
  standard: [
    {
      level: "info",
      message:
        "FamilyCare Standard extends cover to the whole immediate family. " +
        "Parents and extended family members may be added if supported by this product.",
    },
  ],
  premium: [
    {
      level: "info",
      message:
        "Heritage Premium includes parents and extended family cover. " +
        "Higher premiums apply for older members — verify ages carefully.",
    },
  ],
  elite: [
    {
      level: "info",
      message:
        "Legacy Elite provides comprehensive cover for the widest family structure. " +
        "Review eligibility ages for all extended members before submitting.",
    },
  ],
};

// ─── Validation (hard errors) ─────────────────────────────────────────────────

function buildErrors(product: Product, profile: ClientProfile): string[] {
  const errors: string[] = [];

  const mainConfig = product.memberTypes.find((m) => m.type === "main");
  if (!mainConfig) {
    errors.push("Product configuration error: no main member type defined.");
    return errors;
  }

  if (profile.age < mainConfig.minAge) {
    errors.push(
      `You must be at least ${mainConfig.minAge} years old to apply for ${product.name}.`
    );
  }

  if (profile.age > mainConfig.maxAge) {
    errors.push(
      `Entry age for ${product.name} is limited to ${mainConfig.maxAge} years. ` +
      "Please select a product with a higher age entry limit."
    );
  }

  const ageBandExists = product.premiumBands.some(
    (b) => profile.age >= b.minAge && profile.age <= b.maxAge
  );
  if (!ageBandExists && errors.length === 0) {
    errors.push(
      `No premium rate is defined for age ${profile.age} on ${product.name}. ` +
      "This product may not be able to underwrite this application."
    );
  }

  return errors;
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * getProductConfigRules
 *
 * Primary entry point. Call once per render (or in a useMemo) with the loaded
 * Product and the client's profile.
 *
 * @example
 * const rules = getProductConfigRules(product, {
 *   age: 45,
 *   maritalStatus: "married",
 *   hasChildren: true,
 *   hasTerminalIllness: false,
 *   existingCoverTotal: 0,
 * });
 *
 * // Decide whether to show the "spouse" card
 * if (rules.memberTypeRules.spouse?.shown) { ... }
 *
 * // Display notices at top of step
 * rules.notices.forEach(n => toast(n.message));
 *
 * // Block continue button
 * if (!rules.isValid) { ... }
 */
export function getProductConfigRules(
  product: Product,
  profile: ClientProfile
): ProductConfigRules {
  const ALL_MEMBER_TYPES: MemberType[] = [
    "main",
    "spouse",
    "child",
    "parent",
    "parent_in_law",
    "extended",
  ];

  const memberTypeRules: Partial<Record<MemberType, MemberTypeRule>> = {};
  for (const type of ALL_MEMBER_TYPES) {
    const rule = buildMemberTypeRule(product, type, profile);
    // Only include in the result if the product has config for it OR it's "main"
    const productSupports = product.memberTypes.some((m) => m.type === type);
    if (type === "main" || productSupports) {
      memberTypeRules[type] = rule;
    }
  }

  const notices = buildNotices(product, profile);
  const errors = buildErrors(product, profile);

  return {
    memberTypeRules,
    notices,
    isValid: errors.length === 0,
    errors,
  };
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/** Returns true if the product supports the given member type at all. */
export function productSupports(product: Product, type: MemberType): boolean {
  return product.memberTypes.some((m) => m.type === type);
}

/** Returns the maximum number of members of a given type allowed on the product. */
export function getMaxCount(product: Product, type: MemberType): number {
  return product.memberTypes.find((m) => m.type === type)?.maxCount ?? 0;
}

/** Returns the allowed member types for a product tier, for documentation / UI legend. */
export function getAllowedMemberTypesByTier(tier: ProductTier): MemberType[] {
  const tierMap: Record<ProductTier, MemberType[]> = {
    basic:    ["main", "spouse", "child"],
    standard: ["main", "spouse", "child", "parent", "parent_in_law"],
    premium:  ["main", "spouse", "child", "parent", "parent_in_law", "extended"],
    elite:    ["main", "spouse", "child", "parent", "parent_in_law", "extended"],
  };
  return tierMap[tier] ?? ["main"];
}

/** Returns a human-readable label for a notice level. */
export function noticeLevelLabel(level: NoticeLevel): string {
  const labels: Record<NoticeLevel, string> = {
    info: "Information",
    warn: "Important",
    error: "Error",
  };
  return labels[level];
}

/**
 * getSeniorNotice
 *
 * Returns a notice when the client's age triggers age loading,
 * or null when no loading applies.  Useful for rendering a standalone
 * age banner independently of the full rules object.
 */
export function getSeniorNotice(age: number): ConfigNotice | null {
  if (age >= 70) {
    return {
      level: "warn",
      message: `Age ${age}: a 50% age loading applies. Premiums will be significantly higher than the base rate. Confirm product eligibility with the insurer.`,
    };
  }
  if (age >= 60) {
    return {
      level: "warn",
      message: `Age ${age}: a 30% age loading applies. Some products have an entry age limit of 65 — confirm eligibility.`,
    };
  }
  if (age >= 50) {
    return {
      level: "info",
      message: `Age ${age}: a 15% age loading applies to the base premium rate.`,
    };
  }
  return null;
}
