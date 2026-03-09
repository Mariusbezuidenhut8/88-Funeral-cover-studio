import { Product, MemberType, MemberTypeConfig } from "@/types/product.types";
import { FamilyMember } from "@/types/family.types";

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
  warnings: string[];
}

export function checkMemberEligibility(
  product: Product,
  memberType: MemberType,
  age: number,
  existingMembersOfType: number
): EligibilityResult {
  const config = product.memberTypes.find((m) => m.type === memberType);
  const warnings: string[] = [];

  if (!config) {
    return {
      eligible: false,
      reason: `This product does not cover ${memberType} members`,
      warnings,
    };
  }

  if (age < config.minAge || age > config.maxAge) {
    return {
      eligible: false,
      reason: `${config.label} must be between ${config.minAge} and ${config.maxAge} years old`,
      warnings,
    };
  }

  if (existingMembersOfType >= config.maxCount) {
    return {
      eligible: false,
      reason: `Maximum ${config.maxCount} ${config.label} allowed on this product`,
      warnings,
    };
  }

  // Soft warnings
  if (memberType === "parent" || memberType === "parent_in_law") {
    if (age > 65) {
      warnings.push(
        "Parents over 65 attract a higher premium. Please confirm their exact age."
      );
    }
  }

  return { eligible: true, warnings };
}

export function checkMainMemberEligibility(
  product: Product,
  age: number
): EligibilityResult {
  const config = product.memberTypes.find((m) => m.type === "main");
  const warnings: string[] = [];

  if (!config) {
    return { eligible: false, reason: "Product configuration error", warnings };
  }

  if (age < config.minAge) {
    return {
      eligible: false,
      reason: `You must be at least ${config.minAge} years old to apply`,
      warnings,
    };
  }

  if (age > config.maxAge) {
    return {
      eligible: false,
      reason: `Entry age for this product is limited to ${config.maxAge} years`,
      warnings,
    };
  }

  if (age >= 60) {
    warnings.push(
      "Applicants aged 60+ are subject to higher premiums."
    );
  }

  return { eligible: true, warnings };
}

export function validateAllMembers(
  product: Product,
  members: FamilyMember[]
): Map<string, EligibilityResult> {
  const results = new Map<string, EligibilityResult>();
  const countsByType: Record<string, number> = {};

  for (const member of members) {
    const currentCount = countsByType[member.type] || 0;
    const result = checkMemberEligibility(
      product,
      member.type,
      member.age,
      currentCount
    );
    results.set(member.id, result);
    if (result.eligible) {
      countsByType[member.type] = currentCount + 1;
    }
  }

  return results;
}
