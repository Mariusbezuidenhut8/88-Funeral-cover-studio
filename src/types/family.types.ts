import { MemberType } from "./product.types";

export interface FamilyMember {
  id: string;
  type: MemberType;
  firstName: string;
  lastName: string;
  idNumber?: string; // Optional - can use age instead
  dateOfBirth?: string;
  age: number;
  gender?: "male" | "female";
  sumAssured: number; // Can differ from main member
  monthlyPremium?: number; // Calculated
  isEligible?: boolean;
  eligibilityNote?: string;
}

export interface Beneficiary {
  id: string;
  firstName: string;
  lastName: string;
  relationship: string;
  idNumber?: string;
  dateOfBirth?: string;
  percentage: number; // Must total 100%
  mobile?: string;
}
