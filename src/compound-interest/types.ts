import { RoundingMode } from "../core/rounding";

export type CompoundingFrequency = 
  | "annual" 
  | "semi-annual" 
  | "quarterly" 
  | "monthly" 
  | "daily";

export type ContributionTiming = 
  | "START_OF_PERIOD" 
  | "END_OF_PERIOD";

export type TaxAccount = 
  | "TAXABLE" 
  | "TAX_DEFERRED";

export interface ContributionSchedule {
  annualAmount: number;
  // 0.02 for 2% annual raise
  annualEscalation?: number;
  timing?: ContributionTiming;
}

export interface TaxConfig {
  accountType: TaxAccount;
  // 0-1 year gains
  shortTermRate?: number;
  // 1+ year gains
  longTermRate?: number;
}

export interface CompoundInterestInput {
  principal: number;
  annualRate: number;
  years: number;

  frequency?: CompoundingFrequency;
  contributions?: ContributionSchedule;
  tax?: TaxConfig;
  inflation?: number;

  roundingPolicy?: {
    balance?: RoundingMode;
    interest?: RoundingMode;
    tax?: RoundingMode;
  };
  decimalPlaces?: number;
}

export interface CompoundInterestScheduleItem {
  year: number;
  contribution: number;
  interestEarned: number;
  shortTermGains: number;
  longTermGains: number;
  taxesPaid: number;
  balance: number;
  cumulativeContributions: number;
  cumulativeTaxes: number;
  nominalBalance: number;
  // inflation-adjusted
  realBalance: number;
}

export interface CompoundInterestResult {
  finalBalance: number;
  totalContributions: number;
  totalInterestEarned: number;
  totalTaxesPaid: number;
  netGains: number;
  // percent return
  nominalReturn: number;
  // inflation-adjusted return
  realReturn: number;
  // purchasing power in today's dollars
  purchasingPowerValue: number;
  schedule: CompoundInterestScheduleItem[];
}

export interface ScenarioItem {
  scenario: string;
  finalBalance: number;
  totalContributions: number;
  totalTaxesPaid: number;
  netGains: number;
  purchasingPowerValue: number;
}

export interface ScenarioComparison {
  scenarios: ScenarioItem[];
  bestPerformer: string;
  // tax-deferred vs taxable
  taxSavings: number;
  inflationImpact: number;
}
