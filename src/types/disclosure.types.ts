export interface DisclosureItem {
  id: string;
  title: string;
  content: string;
  isRequired: boolean;
  category:
    | "fsp_license"
    | "product"
    | "conflict_of_interest"
    | "cooling_off"
    | "complaints"
    | "popia";
}

export interface DisclosureAcceptance {
  disclosureId: string;
  acceptedAt: string; // ISO timestamp
  ipAddress?: string;
}

export interface DisclosureStepData {
  acceptances: DisclosureAcceptance[];
  allAccepted: boolean;
  completedAt: string;
}
