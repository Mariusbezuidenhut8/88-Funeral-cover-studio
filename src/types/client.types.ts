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
  sumAssured: number;
  monthlyPremium: number;
  policyNumber?: string;
}

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
  monthlyIncome: number;
  existingCover: ExistingCover[];

  // Health
  hasTerminalIllness: boolean;
}
