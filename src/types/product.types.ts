export type ProductTier = "basic" | "standard" | "premium" | "elite";

export type MemberType =
  | "main"
  | "spouse"
  | "child"
  | "parent"
  | "parent_in_law"
  | "extended";

export interface PremiumBand {
  minAge: number;
  maxAge: number;
  ratePerThousand: number; // Monthly premium per R1,000 sum assured
}

export interface MemberTypeConfig {
  type: MemberType;
  label: string;
  maxCount: number;
  minAge: number;
  maxAge: number;
  premiumMultiplier: number; // Relative to main member rate (1.0 = same rate)
  flatRatePerThousand?: number; // Override for children (flat rate regardless of age)
}

export interface Product {
  id: string;
  name: string;
  tier: ProductTier;
  insurer: string;
  description: string;
  tagline: string;

  // Cover limits
  minSumAssured: number;
  maxSumAssured: number;
  sumAssuredStep: number;

  // Premium structure
  premiumBands: PremiumBand[];
  adminFee: number; // Monthly flat admin fee in ZAR

  // Members
  memberTypes: MemberTypeConfig[];

  // Features
  features: string[];
  exclusions: string[];

  // Waiting periods (in months)
  waitingPeriodMonths: number;
  accidentalDeathWaitingPeriodMonths: number;

  // FAIS compliance
  productDisclosureText: string;
  fspNumber: string;
  isActive: boolean;
  effectiveDate: string;
}

/** UI role label assigned after scoring — drives card order and badge text */
export type ProductRole = "recommended" | "lower_cost" | "broader" | "alternative";

export interface ProductCoverStructure {
  mainMember: number;
  spouse: number | null;
  child: number | null; // illustration for 1 child
}

export interface ProductRecommendation {
  product: Product;
  score: number;
  coverAdequacyScore: number;
  affordabilityScore: number;
  memberCoverageScore: number;
  featureScore: number;
  role: ProductRole;
  isRecommended: boolean;
  estimatedMonthlyPremium: number;
  coverStructure: ProductCoverStructure;
  /** Auto-generated reasons why this product suits the client */
  suitabilityReasons: string[];
  /** FAIS-relevant warnings specific to this product */
  productWarnings: string[];
  /** Legacy: compatibility notes from scoring */
  notes: string[];
}
