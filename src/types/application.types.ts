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

export interface NeedsAnalysisStepData {
  totalFuneralCost: number;
  existingCoverTotal: number;
  cashSavings: number;
  coverShortfall: number;
  recommendedCover: number;
  affordabilityRatio: number; // premium/income %
  adviserNotes: string;
  completedAt: string;
}

export interface ProductSelectionStepData {
  selectedProductId: string;
  selectedProductName: string;
  selectionReason?: string;
  completedAt: string;
}

export interface ConfigurationStepData {
  sumAssured: number;
  monthlyPremium: number;
  members: FamilyMember[];
  beneficiaries: Beneficiary[];
  premiumBreakdown: PremiumBreakdown;
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
