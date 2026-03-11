import { FuneralCostBreakdown } from "./calculator.types";
import { FamilyMember, Beneficiary } from "./family.types";
import { DisclosureAcceptance } from "./disclosure.types";
import { Client } from "./client.types";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "pending_review"
  | "approved"
  | "declined"
  | "lapsed";

export interface CalculatorStepData {
  costBreakdown: FuneralCostBreakdown;
  completedAt: string;
}

export interface FactFindStepData {
  client: Client;
  completedAt: string;
}

export interface FamilyRecommendation {
  mainMember: number;
  spouse: number | null; // null if not married/partnered
  child: number;
}

export interface NeedsAnalysisStepData {
  // Core financials
  totalFuneralCost: number;
  existingCoverTotal: number;
  cashSavings: number;
  coverShortfall: number;
  recommendedCover: number;

  // Affordability — feeds Step 4 product filter + Step 7 ROA
  affordabilityRatio: number; // estimated premium as % of income
  affordabilityMinPremium: number; // 2% of income
  affordabilityMaxPremium: number; // 5% of income
  incomeBracketLabel: string;

  // Family cover — feeds Step 5 configuration pre-population
  familyRecommendation: FamilyRecommendation;
  familyCoverRecommended: boolean;

  // Flags — feed Step 7 ROA disclosures
  existingCoverConsidered: boolean;

  // Optional: which scenario the adviser used during the simulator
  scenarioLabel?: string;

  adviserNotes: string;
  completedAt: string;
}

export interface SelectedCoverStructure {
  mainMember: number;
  spouse: number | null;
  child: number | null;
}

export interface ProductAlternative {
  productId: string;
  productName: string;
  role: string;
  estimatedMonthlyPremium: number;
}

export interface ProductSelectionStepData {
  selectedProductId: string;
  selectedProductName: string;
  selectedProductTier: string;
  insurer: string;
  estimatedMonthlyPremium: number;
  coverStructure: SelectedCoverStructure;
  suitabilityReasons: string[];
  productWarnings: string[];
  alternativeOptions: ProductAlternative[];
  selectionReason?: string;
  completedAt: string;
}

export interface PolicyAddOn {
  id: string;
  name: string;
  monthlyPremium: number;
}

/** Counts of each member type included in the policy */
export interface CoveredMembersConfig {
  mainMember: boolean;
  spouse: boolean;
  children: number;
  parents: number;
  parentInLaw: number;
  extendedFamily: number;
}

/** Selected sum assured per member category (0 = not included) */
export interface CoverAmountsConfig {
  mainMember: number;
  spouse: number;
  child: number;       // per-child amount
  parent: number;      // per-parent amount
  parentInLaw: number;
  extendedFamily: number;
}

/** Benefits included or selected at configuration time */
export interface OptionalBenefitsConfig {
  groceryBenefit: boolean;
  tombstoneBenefit: boolean;
  repatriationBenefit: boolean;
  accidentalDeathImmediateCover: boolean;
  premiumWaiver: boolean;
  familyIncomeSupport: boolean;
}

export type ProductAffordabilityStatus =
  | "within_range"
  | "slightly_above_range"
  | "above_range"
  | "unknown";

export interface ConfigurationStepData {
  // Core premium & members (feeds premium calc and ROA)
  sumAssured: number;
  monthlyPremium: number;
  members: FamilyMember[];
  beneficiaries: Beneficiary[];
  premiumBreakdown: PremiumBreakdown;
  addOns?: PolicyAddOn[];

  // Structured summary (feeds Steps 6, 7, 9)
  productCategory?: string;
  coveredMembers?: CoveredMembersConfig;
  coverAmounts?: CoverAmountsConfig;
  optionalBenefits?: OptionalBenefitsConfig;
  affordabilityStatus?: ProductAffordabilityStatus;
  configurationWarnings?: string[];

  // Compliance / audit trail (feeds Step 7 ROA narrative)
  originalRecommendation?: {
    mainMember: number;
    spouse: number | null;
    child: number | null;
    estimatedMonthlyPremium: number;
  };
  coverChangedFromRecommendation?: boolean;
  coverIncreased?: boolean;    // configured premium > recommended premium
  coverDecreased?: boolean;    // configured premium < recommended premium
  affordabilityWarningTriggered?: boolean;
  duplicationWarningShown?: boolean;

  completedAt: string;
}

export interface PremiumBreakdown {
  mainMemberPremium: number;
  memberPremiums: { memberId: string; name: string; premium: number }[];
  adminFee: number;
  total: number;
}

export interface ROAStepData {
  recommendationMotivation: string;
  productsConsidered: { productId: string; productName: string; reason: string }[];
  adviserConfirmed: boolean;
  generatedAt: string;
  completedAt: string;
}

export interface AcceptanceStepData {
  clientSignatureDataUrl: string;
  adviserSignatureDataUrl: string;
  clientSignedAt: string;
  adviserSignedAt: string;
  declarationText: string;
  completedAt: string;
}

export interface BankingDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  accountType: "cheque" | "savings";
  branchCode: string;
  debitOrderDate: number; // Day of month: 1, 15, 25
}

export interface Application {
  id: string;
  referenceNumber: string;
  clientId: string;
  adviserId: string;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  status: ApplicationStatus;

  // Step data
  calculatorData?: CalculatorStepData;
  factFindData?: FactFindStepData;
  needsAnalysisData?: NeedsAnalysisStepData;
  productSelectionData?: ProductSelectionStepData;
  configurationData?: ConfigurationStepData;
  disclosureData?: { acceptances: DisclosureAcceptance[]; completedAt: string };
  roaData?: ROAStepData;
  acceptanceData?: AcceptanceStepData;
  bankingDetails?: BankingDetails;

  // Summary fields (computed on submit)
  recommendedCover?: number;
  selectedCover?: number;
  monthlyPremium?: number;
  productName?: string;
  productId?: string;
}
