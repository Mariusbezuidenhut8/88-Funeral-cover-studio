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

// SA ID validation: 13 digits, Luhn checksum
function validateSAId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  // Luhn algorithm
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
  insurer: z.string().min(1, "Insurer name required"),
  sumAssured: z.number().min(0),
  monthlyPremium: z.number().min(0),
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
  monthlyIncome: z.number().min(0, "Monthly income must be 0 or more"),
  existingCover: z.array(existingCoverSchema).default([]),
  hasTerminalIllness: z.boolean(),
});

export type ClientFormData = z.infer<typeof clientSchema>;
