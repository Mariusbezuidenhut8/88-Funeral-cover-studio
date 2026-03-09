import { format, parseISO, differenceInYears } from "date-fns";

export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "d MMMM yyyy");
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string): string {
  try {
    return format(parseISO(dateString), "d MMM yyyy 'at' HH:mm");
  } catch {
    return dateString;
  }
}

export function calculateAge(dateOfBirth: string): number {
  return differenceInYears(new Date(), parseISO(dateOfBirth));
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function generateReference(): string {
  const date = format(new Date(), "yyyyMMdd");
  const rand = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `FCS-${date}-${rand}`;
}
