import { Product, ProductRecommendation, MemberType } from "@/types/product.types";
import { FamilyMember } from "@/types/family.types";
import { calculateFullPremium } from "./premium-calculator";
import { clamp } from "./needs-calculator";

export interface RecommendationInput {
  recommendedCover: number;
  monthlyIncome: number;
  mainMemberAge: number;
  requiredMemberTypes: MemberType[];
  familyMembers: FamilyMember[];
}

function scoreCoverAdequacy(product: Product, recommendedCover: number): number {
  // 40 points max
  if (product.maxSumAssured >= recommendedCover) return 40;
  // Partial score if can cover at least 80% of need
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
  // 30 points max
  if (monthlyIncome <= 0) return 15; // Neutral if no income data

  const sumAssured = clamp(
    recommendedCover,
    product.minSumAssured,
    product.maxSumAssured
  );
  const premium = calculateFullPremium(product, mainMemberAge, sumAssured, members);
  const ratio = (premium.total / monthlyIncome) * 100;

  if (ratio <= 5) return 30;
  if (ratio <= 8) return 25;
  if (ratio <= 10) return 20;
  if (ratio <= 12) return 12;
  if (ratio <= 15) return 6;
  return 0;
}

function scoreMemberCoverage(
  product: Product,
  requiredMemberTypes: MemberType[]
): number {
  // 20 points max
  if (requiredMemberTypes.length === 0) return 20;
  const productTypes = product.memberTypes.map((m) => m.type);
  const covered = requiredMemberTypes.filter((t) => productTypes.includes(t)).length;
  return Math.round((covered / requiredMemberTypes.length) * 20);
}

function scoreFeatures(product: Product): number {
  // 10 points max
  let score = 0;
  if (product.accidentalDeathWaitingPeriodMonths === 0) score += 3;
  if (product.waitingPeriodMonths <= 6) score += 2;
  const hasRepatriation = product.features.some((f) =>
    f.toLowerCase().includes("repatriation")
  );
  const hasGrocery = product.features.some((f) =>
    f.toLowerCase().includes("grocery")
  );
  const hasTombstone = product.features.some((f) =>
    f.toLowerCase().includes("tombstone")
  );
  if (hasRepatriation) score += 2;
  if (hasGrocery) score += 2;
  if (hasTombstone) score += 1;
  return Math.min(score, 10);
}

export function recommendProducts(
  products: Product[],
  input: RecommendationInput
): ProductRecommendation[] {
  const activeProducts = products.filter((p) => p.isActive);

  const scored = activeProducts.map((product) => {
    const coverAdequacyScore = scoreCoverAdequacy(product, input.recommendedCover);
    const affordabilityScore = scoreAffordability(
      product,
      input.mainMemberAge,
      input.recommendedCover,
      input.monthlyIncome,
      input.familyMembers
    );
    const memberCoverageScore = scoreMemberCoverage(product, input.requiredMemberTypes);
    const featureScore = scoreFeatures(product);
    const score = coverAdequacyScore + affordabilityScore + memberCoverageScore + featureScore;

    const sumAssured = clamp(
      input.recommendedCover,
      product.minSumAssured,
      product.maxSumAssured
    );
    const premiumCalc = calculateFullPremium(
      product,
      input.mainMemberAge,
      sumAssured,
      input.familyMembers
    );

    const notes: string[] = [];
    if (product.maxSumAssured < input.recommendedCover) {
      notes.push(
        `Maximum cover (R${product.maxSumAssured.toLocaleString()}) is less than your recommended amount`
      );
    }
    const productTypes = product.memberTypes.map((m) => m.type);
    const uncovered = input.requiredMemberTypes.filter(
      (t) => !productTypes.includes(t)
    );
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
      isRecommended: false,
      estimatedMonthlyPremium: premiumCalc.total,
      notes,
    } as ProductRecommendation;
  });

  // Sort descending by score
  const sorted = scored.sort((a, b) => b.score - a.score);

  // Mark top scorer as recommended
  if (sorted.length > 0) {
    sorted[0].isRecommended = true;
  }

  return sorted;
}
