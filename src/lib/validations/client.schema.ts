import { z } from "zod";

export const SA_PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export const INCOME_BRACKETS = [
  { value: "under-3000", label: "Under R3,000" },
  { value: "3000-6000", label: "R3,000 – R6,000" },
  { value: "6000-10000", label: "R6,000 – R10,000" },
  { value: "10000-20000", label: "R10,000 – R20,000" },
  { value: "over-20000", label: "Over R20,000" },
] as const;

export const MARITAL_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "living-with-partner", label: "Living with partner" },
  { value: "widowed", label: "Widowed" },
  { value: "divorced", label: "Divorced" },
] as const;

export const PAYMENT_DATE_OPTIONS = [
  { value: "1", label: "1st" },
  { value: "7", label: "7th" },
  { value: "15", label: "15th" },
  { value: "25", label: "25th" },
] as const;

export const COVER_TYPES = [
  { value: "funeral", label: "Funeral Cover" },
  { value: "life", label: "Life Cover" },
] as const;

export const POLICY_OWNER_OPTIONS = [
  { value: "self", label: "Self" },
  { value: "spouse", label: "Spouse" },
  { value: "parent", label: "Parent" },
] as const;

// SA ID validation: 13 digits, Luhn checksum
function validateSAId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let digit = parseInt(id[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export const addressSchema = z.object({
  line1: z.string().min(3, "Street address required"),
  line2: z.string().optional(),
  suburb: z.string().min(2, "Suburb required"),
  city: z.string().min(2, "City required"),
  province: z.enum(SA_PROVINCES, { message: "Select a province" }),
  postalCode: z.string().regex(/^\d{4}$/, "Postal code must be 4 digits"),
});

export const existingCoverSchema = z.object({
  id: z.string(),
  insurer: z.string().min(1, "Policy provider required"),
  coverType: z.enum(["life", "funeral"], { message: "Select cover type" }),
  sumAssured: z.number().min(1, "Cover amount required"),
  monthlyPremium: z.number().min(1, "Monthly premium required"),
  policyOwner: z.enum(["self", "spouse", "parent"], {
    message: "Select policy owner",
  }),
  policyStartDate: z.string().min(1, "Policy start date required"),
  policyNumber: z.string().optional(),
});

export const clientSchema = z.object({
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  idNumber: z
    .string()
    .length(13, "SA ID must be 13 digits")
    .refine(validateSAId, "Invalid SA ID number (checksum failed)"),
  mobile: z
    .string()
    .regex(/^(\+27|0)[6-8]\d{8}$/, "Enter a valid SA mobile number"),
  email: z.string().email("Enter a valid email address"),
  address: addressSchema,
  employmentStatus: z.enum([
    "employed",
    "self-employed",
    "unemployed",
    "retired",
    "student",
  ]),
  maritalStatus: z.enum(
    ["single", "married", "living-with-partner", "widowed", "divorced"],
    { message: "Select marital status" }
  ),
  incomeBracket: z.enum(
    ["under-3000", "3000-6000", "6000-10000", "10000-20000", "over-20000"],
    { message: "Select an income bracket" }
  ),
  preferredPaymentDate: z.enum(["1", "7", "15", "25"], {
    message: "Select a preferred payment date",
  }),
  existingCover: z.array(existingCoverSchema).default([]),
  hasTerminalIllness: z.enum(["yes", "no"], {
    message: "Please answer the health declaration",
  }),
  consentGiven: z.literal(true, {
    message: "You must confirm the declaration to continue",
  }),
});

export type ClientFormData = z.infer<typeof clientSchema>;
