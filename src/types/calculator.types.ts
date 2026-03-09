export interface FuneralCostItem {
  key: string;
  label: string;
  description: string;
  defaultAmount: number;
  minAmount: number;
  maxAmount: number;
  step: number;
  amount: number;
  isOptional: boolean;
  isCultural: boolean; // e.g. livestock slaughter
}

export interface FuneralCostBreakdown {
  food: number;
  tents: number;
  transport: number;
  livestock: number;
  vigil: number;
  burial: number;
  headstone: number;
  funeral_parlour: number;
  programme: number;
  clothing: number;
  miscellaneous: number;
  total: number;
  recommendedCover: number; // total × 1.15 rounded to nearest R2,500
}

export type CostCategory = keyof Omit<
  FuneralCostBreakdown,
  "total" | "recommendedCover"
>;
