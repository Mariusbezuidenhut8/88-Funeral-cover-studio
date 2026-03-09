/**
 * SA ID Number utilities
 * Format: YYMMDD SSSS C A Z
 * - YYMMDD: Date of birth
 * - SSSS: Sequence (0000-4999 = female, 5000-9999 = male)
 * - C: Citizenship (0 = SA citizen, 1 = permanent resident)
 * - A: Race (was used historically, now always 8)
 * - Z: Luhn checksum digit
 */

export interface SAIdInfo {
  isValid: boolean;
  dateOfBirth?: string; // YYYY-MM-DD
  age?: number;
  gender?: "male" | "female";
  isCitizen?: boolean;
  error?: string;
}

function luhnCheck(id: string): boolean {
  let sum = 0;
  for (let i = 0; i < id.length; i++) {
    let digit = parseInt(id[i]);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

export function parseSAId(idNumber: string): SAIdInfo {
  const cleaned = idNumber.replace(/\s/g, "");

  if (!/^\d{13}$/.test(cleaned)) {
    return { isValid: false, error: "ID must be exactly 13 digits" };
  }

  if (!luhnCheck(cleaned)) {
    return { isValid: false, error: "ID number failed checksum validation" };
  }

  // Parse date of birth
  const yy = parseInt(cleaned.substring(0, 2));
  const mm = parseInt(cleaned.substring(2, 4));
  const dd = parseInt(cleaned.substring(4, 6));

  // Century determination: if yy <= current year's 2-digit, use 2000s, else 1900s
  const currentYearShort = new Date().getFullYear() % 100;
  const yyyy = yy <= currentYearShort ? 2000 + yy : 1900 + yy;

  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
    return { isValid: false, error: "ID contains an invalid date" };
  }

  const dateOfBirth = `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  const dob = new Date(dateOfBirth);

  if (isNaN(dob.getTime())) {
    return { isValid: false, error: "ID contains an invalid date" };
  }

  // Calculate age
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  // Gender (digits 7-10, index 6-9)
  const genderDigits = parseInt(cleaned.substring(6, 10));
  const gender = genderDigits >= 5000 ? "male" : "female";

  // Citizenship (digit 11, index 10)
  const isCitizen = cleaned[10] === "0";

  return {
    isValid: true,
    dateOfBirth,
    age,
    gender,
    isCitizen,
  };
}

export function validateSAId(idNumber: string): boolean {
  return parseSAId(idNumber).isValid;
}
