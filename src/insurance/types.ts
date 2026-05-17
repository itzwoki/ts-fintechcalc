import { RoundingMode } from "../core/rounding";

export type InsuranceType = "TERM_LIFE" | "WHOLE_LIFE";

export type HealthStatus = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

export type OccupationRisk = "LOW" | "MEDIUM" | "HIGH";

export type MedicalHistory = 
  | "NONE" 
  | "MINOR_CONDITIONS" 
  | "CHRONIC_DISEASE" 
  | "SERIOUS_ILLNESS";

export type AgeBand = 
  | "18_25" 
  | "26_35" 
  | "36_45" 
  | "46_55" 
  | "56_65" 
  | "65_PLUS";

export interface RiskProfile {
  healthStatus: HealthStatus;
  occupationRisk: OccupationRisk;
  medicalHistory: MedicalHistory;
  smoker?: boolean;
}

export interface InsuranceRiders {
  accidentalDeathBenefitRate?: number; // Dollars per $1,000 face amount
  waiverOfPremium?: boolean;
}

export interface InsuranceInput {
  insuranceType: InsuranceType;
  age: number;
  faceAmount: number;
  termYears?: number;  // Required for TERM_LIFE

  riskProfile: RiskProfile;
  
  coverageDecreaseRate?: number;  // Annual decrease (e.g., 0.02 = 2%)
  inflationAdjustment?: number;   // Coverage growth with inflation
  riders?: InsuranceRiders;

  roundingPolicy?: {
    premium?: RoundingMode;
    coverage?: RoundingMode;
  };
  decimalPlaces?: number;
}

export interface InsuranceScheduleItem {
  year: number;
  age: number;
  annualPremium: number;
  currentCoverage: number;
  riskMultiplier: number;
  cumulativePremiumsPaid: number;
  costPerThousandCoverage: number;
  riderPremium?: number;
  cashValue?: number;  // For WHOLE_LIFE only
}

export interface InsuranceResult {
  annualPremium: number;
  totalPremiumsOverTerm: number;
  averageCostPerThousand: number;
  finalCoverage: number;
  originalCoverage: number;
  riskMultiplier: number;
  insuranceType: InsuranceType;
  ageBand: AgeBand;
  schedule: InsuranceScheduleItem[];
  riderPremium?: number;
  totalRiderCost?: number;
  
  // WHOLE_LIFE only
  projectedCashValue?: number;
}

export interface InsuranceComparison {
  termLife: InsuranceResult;
  wholeLife: InsuranceResult;
  annualPremiumDifference: number;
  totalCostDifference: number;
  recommendation: string;
}
