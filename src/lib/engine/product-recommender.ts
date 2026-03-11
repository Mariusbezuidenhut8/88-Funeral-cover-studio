import {
  Product,
  ProductRecommendation,
  ProductRole,
  ProductCoverStructure,
  MemberType,
} from "@/types/product.types";
import { FamilyMember } from "@/types/family.types";
import { calculateFullPremium, findPremiumBand } from "./premium-calculator";
import { clamp } from "./needs-calculator";

// ─── Input types ──────────────────────────────────────────────────────────────

export interface RecommendationInput {
  recommendedCover: number;
  monthlyIncome: number;
  mainMemberAge: number;
  requiredMemberTypes: MemberType[];
  familyMembers: FamilyMember[];

  // Client profile — drives role assignment and suitability reasons
  hasSpouseOrPartner?: boolean;
  hasChildren?: boolean;
  hasTerminalIllness?: boolean;
  existingCoverTotal?: number;
  affordabilityMaxPremium?: number;
  familyRecommendation?: {
    mainMember: number;
    spouse: number | null;
    child: number;
  };
}

// ─── Illustration premium ─────────────────────────────────────────────────────

/**
 * Estimate the monthly premium for a product using the family recommendation
 * from Step 3 without needing full FamilyMember objects (used in Step 4 only).
 * Step 5 will recalculate with actual member details.
 */
export function calculateIllustrationPremium(
  product: Product,
  mainMemberAge: number,
  coverStructure: ProductCoverStructure
): number {
  const mainBand = findPremiumBand(product.premiumBands, mainMemberAge);
  if (!mainBand) return 0;

  const mainCover = clamp(
    coverStructure.mainMember,
    product.minSumAssured,
    product.maxSumAssured
  );
  let total = (mainCover / 1000) * mainBand.ratePerThousand;

  // Spouse — assume same age as main member for illustration
  if (coverStructure.spouse !== null) {
    const spouseConfig = product.memberTypes.find((m) => m.type === "spouse");
    if (spouseConfig) {
      const spouseCover = clamp(
        coverStructure.spouse,
        product.minSumAssured,
        product.maxSumAssured
      );
      total +=
        (spouseCover / 1000) *
        mainBand.ratePerThousand *
        spouseConfig.premiumMultiplier;
    }
  }

  // Child — flat rate, 1 child for illustration
  if (coverStructure.child !== null && coverStructure.child > 0) {
    const childConfig = product.memberTypes.find((m) => m.type === "child");
    if (childConfig?.flatRatePerThousand !== undefined) {
      const childCover = Math.min(coverStructure.child, 20000);
      total += (childCover / 1000) * childConfig.flatRatePerThousand;
    }
  }

  return Math.round(total + product.adminFee);
}

// ─── Build cover structure for a product ─────────────────────────────────────

function buildCoverStructure(
  product: Product,
  input: RecommendationInput
): ProductCoverStructure {
  const rec = input.familyRecommendation;
  const mainMember = clamp(
    rec?.mainMember ?? input.recommendedCover,
    product.minSumAssured,
    product.maxSumAssured
  );

  const hasSpouseSupport = product.memberTypes.some((m) => m.type === "spouse");
  const spouse =
    input.hasSpouseOrPartner && hasSpouseSupport && rec?.spouse != null
      ? clamp(rec.spouse, product.minSumAssured, product.maxSumAssured)
      : null;

  const hasChildSupport = product.memberTypes.some((m) => m.type === "child");
  const child =
    input.hasChildren && hasChildSupport && rec?.child != null
      ? Math.min(rec.child, 20000)
      : null;

  return { mainMember, spouse, child };
}

// ─── Suitability reasons (role-aware, 2nd pass after role assignment) ─────────
//
// Reason sets match the spec examples exactly:
//   recommended  → why this is the best match for THIS client
//   lower_cost   → why this suits clients prioritising affordability
//   broader      → why this suits clients with wider family responsibility

function buildRoleBasedReasons(
  product: Product,
  role: ProductRole,
  input: RecommendationInput
): string[] {
  const types = product.memberTypes.map((m) => m.type);
  const hasFamily = (input.hasSpouseOrPartner ?? false) || (input.hasChildren ?? false);
  const reasons: string[] = [];

  if (role === "recommended") {
    // Contextual to the client's specific profile
    if (input.hasSpouseOrPartner) {
      reasons.push("You indicated that you are married or living with a partner.");
    }
    if (hasFamily) {
      reasons.push("You require cover for more than one family member.");
    } else {
      reasons.push("This product provides appropriate cover for your circumstances.");
    }
    if (product.maxSumAssured >= input.recommendedCover) {
      reasons.push(
        `Your recommended cover amount of R${input.recommendedCover.toLocaleString()} fits within this product's cover structure.`
      );
    }
    if ((input.affordabilityMaxPremium ?? 0) > 0) {
      reasons.push("This option is aligned with your recommended affordability range.");
    }
    // Top feature (repatriation, grocery, tombstone)
    const topFeature = product.features.find((f) =>
      ["grocery", "repatriation", "tombstone"].some((kw) => f.toLowerCase().includes(kw))
    );
    if (topFeature) reasons.push(topFeature);

  } else if (role === "lower_cost") {
    reasons.push("This option provides funeral protection at a lower monthly cost.");
    if (!hasFamily) {
      reasons.push("It may suit clients who want cover for the main member only.");
    } else {
      reasons.push("It provides core funeral protection while keeping premiums lower.");
    }
    reasons.push(
      "It keeps the premium closer to the lower end of the recommended affordability range."
    );
    if (product.maxSumAssured < input.recommendedCover) {
      reasons.push(
        `Cover is capped at R${product.maxSumAssured.toLocaleString()} — suitable for a basic funeral arrangement.`
      );
    }

  } else if (role === "broader") {
    if (types.includes("extended")) {
      reasons.push(
        "You indicated responsibility for additional family members beyond your immediate household."
      );
    } else {
      reasons.push("This option is better suited where extended family responsibility exists.");
    }
    if (types.includes("parent")) {
      reasons.push(
        "This option is better suited where parents or extended relatives need cover."
      );
    }
    if (types.includes("extended")) {
      reasons.push(
        "It extends protection to siblings, grandparents, aunts and uncles."
      );
    }
    reasons.push("It offers broader family protection but at a higher premium.");

  } else {
    // Fallback for alternative (not shown in UI but stored for ROA)
    reasons.push(`Provides funeral cover up to R${product.maxSumAssured.toLocaleString()}.`);
  }

  return reasons.slice(0, 5);
}

// ─── Rule-based client profile scoring ───────────────────────────────────────
// Implements Rules 1–4 as explicit score adjustments on top of the base scores.

function scoreClientProfile(product: Product, input: RecommendationInput): number {
  const types = product.memberTypes.map((m) => m.type);
  let score = 0;

  // ── Rule 1: Senior eligibility ─────────────────────────────────────────────
  // If client age >= 60 and the product has no premium band for that age,
  // it cannot legally underwrite the policy → heavy disqualification penalty.
  if (input.mainMemberAge >= 60) {
    const ageBand = findPremiumBand(product.premiumBands, input.mainMemberAge);
    if (!ageBand) {
      score -= 40; // Disqualify — product cannot cover this age
    }
    // Legacy Elite supports parents up to 80 — preference for clients near upper limits
    const parentConfig = product.memberTypes.find((m) => m.type === "parent");
    if (parentConfig && parentConfig.maxAge >= 75) {
      score += 5;
    }
  }

  // ── Rule 2: Terminal illness — demote standard products ─────────────────────
  // All current products exclude pre-existing terminal conditions. Deprioritise
  // so the lower-cost option appears first (closer to simplified acceptance).
  if (input.hasTerminalIllness) {
    // Penalise higher tiers more (they have stricter underwriting in practice)
    const tierPenalty: Record<string, number> = {
      basic: 0,
      standard: -5,
      premium: -10,
      elite: -15,
    };
    score += tierPenalty[product.tier] ?? -5;
  }

  // ── Rule 3: Family structure match ─────────────────────────────────────────
  // Boost products that can cover the required family members.
  if (input.hasSpouseOrPartner && types.includes("spouse")) score += 8;
  if (input.hasChildren && types.includes("child")) score += 7;

  // ── Rule 4: Extended family capability ─────────────────────────────────────
  // Products with parent/extended support score higher when extended family
  // responsibility is implied. No explicit "extended_count" input yet — scored
  // on capability so Extended Family Cover rises for Step 4 "broader" option.
  if (types.includes("parent")) score += 4;
  if (types.includes("extended")) score += 3;

  return score;
}

// ─── Product warnings (4 FAIS warning types) ─────────────────────────────────
//
// Warning 1 — Affordability:  premium exceeds recommended ceiling
// Warning 2 — Duplication:    existing cover already in place
// Warning 3 — Health:         terminal illness declaration
// Warning 4 — Age:            age-based entry limits on member categories

function buildProductWarnings(
  product: Product,
  input: RecommendationInput,
  illustrationPremium: number
): string[] {
  const warnings: string[] = [];

  // Rule 1 — age eligibility (hard disqualification)
  const ageNotCovered = !product.premiumBands.some(
    (b) => b.minAge <= input.mainMemberAge && b.maxAge >= input.mainMemberAge
  );
  if (ageNotCovered) {
    warnings.push(
      `Client age (${input.mainMemberAge}) falls outside the entry age limit for this product. Eligibility must be confirmed with the insurer.`
    );
  }

  // Warning 4 — Age (general): member categories have age-based limits
  // Show for 50+ even if main member is covered, because parent/extended types
  // have tighter age bands that may affect the policy in practice.
  if (input.mainMemberAge >= 50 && !ageNotCovered) {
    warnings.push(
      "Some member categories may have age-based entry limits. Final eligibility will depend on product rules."
    );
  }

  // Warning 3 — Health
  if (input.hasTerminalIllness) {
    warnings.push(
      "Some products may have eligibility limits or restrictions based on the health information provided. Confirm underwriting acceptance with the insurer before proceeding."
    );
  }

  // Warning 1 — Affordability
  if ((input.affordabilityMaxPremium ?? 0) > 0 && illustrationPremium > (input.affordabilityMaxPremium ?? 0)) {
    warnings.push(
      "This option may be above the recommended monthly premium range based on the income provided."
    );
  }

  // Warning 2 — Duplication
  if ((input.existingCoverTotal ?? 0) > 0) {
    warnings.push(
      "Existing funeral cover was identified. Please review whether additional cover is still required."
    );
  }

  // Cover adequacy note
  if (product.maxSumAssured < input.recommendedCover) {
    warnings.push(
      `Maximum sum assured (R${product.maxSumAssured.toLocaleString()}) is below the recommended R${input.recommendedCover.toLocaleString()}. Consider a product with higher cover limits.`
    );
  }

  return warnings;
}

// ─── Role assignment ──────────────────────────────────────────────────────────

function assignRoles(recs: ProductRecommendation[]): void {
  if (recs.length === 0) return;

  // Top scorer = recommended
  recs[0].role = "recommended";
  recs[0].isRecommended = true;

  if (recs.length === 1) return;

  const rest = recs.slice(1);

  // Lowest premium among the rest = lower_cost
  const lowestPremiumRec = rest.reduce((min, rec) =>
    rec.estimatedMonthlyPremium < min.estimatedMonthlyPremium ? rec : min
  );
  lowestPremiumRec.role = "lower_cost";

  // Highest maxSumAssured among remaining (not already assigned) = broader
  const remaining = rest.filter((r) => r.role === "alternative");
  if (remaining.length > 0) {
    const broaderRec = remaining.reduce((max, rec) =>
      rec.product.maxSumAssured > max.product.maxSumAssured ? rec : max
    );
    broaderRec.role = "broader";
  }
}

// ─── Scoring (unchanged from original) ───────────────────────────────────────

function scoreCoverAdequacy(product: Product, recommendedCover: number): number {
  if (product.maxSumAssured >= recommendedCover) return 40;
  const coverage = product.maxSumAssured / recommendedCover;
  if (coverage >= 0.8) return 25;
  if (coverage >= 0.6) return 15;
  return 5;
}

function scoreAffordability(
  product: Product,
  mainMemberAge: number,
  recommendedCover: number,
  monthlyIncome: number,
  members: FamilyMember[]
): number {
  if (monthlyIncome <= 0) return 15;
  const sumAssured = clamp(recommendedCover, product.minSumAssured, product.maxSumAssured);
  const premium = calculateFullPremium(product, mainMemberAge, sumAssured, members);
  const ratio = (premium.total / monthlyIncome) * 100;
  if (ratio <= 5) return 30;
  if (ratio <= 8) return 25;
  if (ratio <= 10) return 20;
  if (ratio <= 12) return 12;
  if (ratio <= 15) return 6;
  return 0;
}

function scoreMemberCoverage(product: Product, requiredMemberTypes: MemberType[]): number {
  if (requiredMemberTypes.length === 0) return 20;
  const productTypes = product.memberTypes.map((m) => m.type);
  const covered = requiredMemberTypes.filter((t) => productTypes.includes(t)).length;
  return Math.round((covered / requiredMemberTypes.length) * 20);
}

function scoreFeatures(product: Product): number {
  let score = 0;
  if (product.accidentalDeathWaitingPeriodMonths === 0) score += 3;
  if (product.waitingPeriodMonths <= 6) score += 2;
  if (product.features.some((f) => f.toLowerCase().includes("repatriation"))) score += 2;
  if (product.features.some((f) => f.toLowerCase().includes("grocery"))) score += 2;
  if (product.features.some((f) => f.toLowerCase().includes("tombstone"))) score += 1;
  return Math.min(score, 10);
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function recommendProducts(
  products: Product[],
  input: RecommendationInput
): ProductRecommendation[] {
  const activeProducts = products.filter((p) => p.isActive);

  // ── Rule 3: Auto-derive required member types from client profile ──────────
  // This ensures scoreMemberCoverage differentiates products that can vs cannot
  // cover the client's family members, even when the caller passes [] explicitly.
  const derivedRequiredTypes: MemberType[] = [...input.requiredMemberTypes];
  if (input.hasSpouseOrPartner && !derivedRequiredTypes.includes("spouse")) {
    derivedRequiredTypes.push("spouse");
  }
  if (input.hasChildren && !derivedRequiredTypes.includes("child")) {
    derivedRequiredTypes.push("child");
  }

  const enrichedInput: RecommendationInput = {
    ...input,
    requiredMemberTypes: derivedRequiredTypes,
  };

  const scored = activeProducts.map((product): ProductRecommendation => {
    const coverStructure = buildCoverStructure(product, enrichedInput);
    const illustrationPremium = calculateIllustrationPremium(
      product,
      enrichedInput.mainMemberAge,
      coverStructure
    );

    const coverAdequacyScore = scoreCoverAdequacy(product, enrichedInput.recommendedCover);
    const affordabilityScore = scoreAffordability(
      product,
      enrichedInput.mainMemberAge,
      enrichedInput.recommendedCover,
      enrichedInput.monthlyIncome,
      enrichedInput.familyMembers
    );
    const memberCoverageScore = scoreMemberCoverage(product, enrichedInput.requiredMemberTypes);
    const featureScore = scoreFeatures(product);

    // Rules 1–4: client profile scoring adjustments
    const profileScore = scoreClientProfile(product, enrichedInput);

    const score =
      coverAdequacyScore + affordabilityScore + memberCoverageScore + featureScore + profileScore;

    // Legacy notes
    const notes: string[] = [];
    if (product.maxSumAssured < enrichedInput.recommendedCover) {
      notes.push(
        `Maximum cover (R${product.maxSumAssured.toLocaleString()}) is less than your recommended amount`
      );
    }
    const productTypes = product.memberTypes.map((m) => m.type);
    const uncovered = enrichedInput.requiredMemberTypes.filter((t) => !productTypes.includes(t));
    if (uncovered.length > 0) {
      notes.push(`Does not cover: ${uncovered.join(", ")}`);
    }

    return {
      product,
      score,
      coverAdequacyScore,
      affordabilityScore,
      memberCoverageScore,
      featureScore,
      role: "alternative", // overridden by assignRoles()
      isRecommended: false,
      estimatedMonthlyPremium: illustrationPremium,
      coverStructure,
      suitabilityReasons: [], // populated in second pass after roles are assigned
      // Rule 5 — pass illustration premium for affordability ceiling check
      productWarnings: buildProductWarnings(product, enrichedInput, illustrationPremium),
      notes,
    };
  });

  // Sort descending by score
  const sorted = scored.sort((a, b) => b.score - a.score);

  // Assign roles (recommended / lower_cost / broader / alternative)
  assignRoles(sorted);

  // Second pass: generate role-aware suitability reasons now that roles are known
  sorted.forEach((rec) => {
    rec.suitabilityReasons = buildRoleBasedReasons(rec.product, rec.role, enrichedInput);
  });

  return sorted;
}
