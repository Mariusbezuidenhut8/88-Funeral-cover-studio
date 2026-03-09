export type SAProvince =
  | "Eastern Cape"
  | "Free State"
  | "Gauteng"
  | "KwaZulu-Natal"
  | "Limpopo"
  | "Mpumalanga"
  | "North West"
  | "Northern Cape"
  | "Western Cape";

export type EmploymentStatus =
  | "employed"
  | "self-employed"
  | "unemployed"
  | "retired"
  | "student";

export type MaritalStatus =
  | "single"
  | "married"
  | "living-with-partner"
  | "widowed"
  | "divorced";

export type IncomeBracket =
  | "under-3000"
  | "3000-6000"
  | "6000-10000"
  | "10000-20000"
  | "over-20000";

export type CoverType = "life" | "funeral";

export type PolicyOwner = "self" | "spouse" | "parent";

export interface Address {
  line1: string;
  line2?: string;
  suburb: string;
  city: string;
  province: SAProvince;
  postalCode: string;
}

export interface ExistingCover {
  id: string;
  insurer: string;
  coverType: CoverType;
  sumAssured: number;
  monthlyPremium: number;
  policyOwner: PolicyOwner;
  policyStartDate: string; // YYYY-MM-DD
  policyNumber?: string;
}

/** Midpoint values for income brackets — used in premium affordability calculations */
export const INCOME_BRACKET_MIDPOINTS: Record<IncomeBracket, number> = {
  "under-3000": 1500,
  "3000-6000": 4500,
  "6000-10000": 8000,
  "10000-20000": 15000,
  "over-20000": 25000,
};

export interface Client {
  id: string;
  createdAt: string;
  updatedAt: string;
  adviserId: string;

  // Personal
  firstName: string;
  lastName: string;
  idNumber: string;
  dateOfBirth: string;
  gender: "male" | "female";
  age: number;

  // Contact
  mobile: string;
  email: string;
  address: Address;

  // Financial profile
  employmentStatus: EmploymentStatus;
  maritalStatus: MaritalStatus;
  incomeBracket: IncomeBracket;
  monthlyIncome: number; // Midpoint derived from bracket — used by engine
  existingCover: ExistingCover[];

  // Preferences
  preferredPaymentDate: "1" | "7" | "15" | "25";

  // Health
  hasTerminalIllness: boolean;
}
