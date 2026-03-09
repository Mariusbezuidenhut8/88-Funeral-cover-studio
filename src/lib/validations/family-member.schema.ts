import { z } from "zod";

export const MEMBER_TYPES = [
  "spouse",
  "child",
  "parent",
  "parent_in_law",
  "extended",
] as const;

export const familyMemberSchema = z.object({
  id: z.string(),
  type: z.enum(MEMBER_TYPES),
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  idNumber: z.string().optional(),
  age: z.number().min(0).max(100, "Age must be between 0 and 100"),
  gender: z.enum(["male", "female"]).optional(),
  sumAssured: z
    .number()
    .min(5000, "Minimum cover is R5,000")
    .max(100000, "Maximum cover is R100,000"),
});

export const beneficiarySchema = z.object({
  id: z.string(),
  firstName: z.string().min(2, "First name required"),
  lastName: z.string().min(2, "Last name required"),
  relationship: z.string().min(1, "Relationship required"),
  idNumber: z.string().optional(),
  percentage: z.number().min(1).max(100),
  mobile: z.string().optional(),
});

export type FamilyMemberFormData = z.infer<typeof familyMemberSchema>;
export type BeneficiaryFormData = z.infer<typeof beneficiarySchema>;
