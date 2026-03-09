import { Product, PremiumBand, MemberTypeConfig } from "@/types/product.types";
import { FamilyMember } from "@/types/family.types";
import { PremiumBreakdown } from "@/types/application.types";

export function findPremiumBand(
  bands: PremiumBand[],
  age: number
): PremiumBand | null {
  return bands.find((b) => age >= b.minAge && age <= b.maxAge) || null;
}

export function calculateMainMemberPremium(
  product: Product,
  age: number,
  sumAssured: number
): number {
  const band = findPremiumBand(product.premiumBands, age);
  if (!band) return 0;
  return (sumAssured / 1000) * band.ratePerThousand;
}

export function calculateMemberPremium(
  product: Product,
  member: FamilyMember,
  mainMemberPremiumPerThousand: number
): number {
  const config = product.memberTypes.find((m) => m.type === member.type);
  if (!config) return 0;

  // Children use flat rate regardless of age
  if (config.flatRatePerThousand !== undefined) {
    return (member.sumAssured / 1000) * config.flatRatePerThousand;
  }

  // Extended/parents: use their own age band × main member band rate × multiplier
  const band = findPremiumBand(product.premiumBands, member.age);
  if (!band) return 0;

  return (member.sumAssured / 1000) * band.ratePerThousand * config.premiumMultiplier;
}

export interface PremiumCalculationResult {
  mainMemberPremium: number;
  memberBreakdown: { memberId: string; name: string; premium: number; type: string }[];
  adminFee: number;
  subtotal: number;
  total: number;
}

export function calculateFullPremium(
  product: Product,
  mainMemberAge: number,
  sumAssured: number,
  members: FamilyMember[]
): PremiumCalculationResult {
  const mainBand = findPremiumBand(product.premiumBands, mainMemberAge);
  const mainMemberRatePerThousand = mainBand?.ratePerThousand || 0;
  const mainMemberPremium = (sumAssured / 1000) * mainMemberRatePerThousand;

  const memberBreakdown = members.map((member) => ({
    memberId: member.id,
    name: `${member.firstName} ${member.lastName}`,
    type: member.type,
    premium: calculateMemberPremium(product, member, mainMemberRatePerThousand),
  }));

  const memberTotal = memberBreakdown.reduce((sum, m) => sum + m.premium, 0);
  const subtotal = mainMemberPremium + memberTotal;
  const total = subtotal + product.adminFee;

  return {
    mainMemberPremium,
    memberBreakdown,
    adminFee: product.adminFee,
    subtotal,
    total,
  };
}

export function toPremiumBreakdown(
  result: PremiumCalculationResult
): PremiumBreakdown {
  return {
    mainMemberPremium: result.mainMemberPremium,
    memberPremiums: result.memberBreakdown.map((m) => ({
      memberId: m.memberId,
      name: m.name,
      premium: m.premium,
    })),
    adminFee: result.adminFee,
    total: result.total,
  };
}
