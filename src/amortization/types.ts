import { RoundingMode } from "../core/rounding";

export type PaymentFrequency = "monthly" | "quarterly";

export type LoanType =
  | "FULLY_AMORTIZING"
  | "INTEREST_ONLY"
  | "BULLET";

export type RoundingTiming =
  | "PER_PERIOD"
  | "END_ONLY";

export interface ExtraPayment {
  period: number;
  amount: number;
}

export interface RateAdjustment {
  fromPeriod: number;
  annualInterestRate: number;
}

export interface RoundingPolicy {
  payment?: RoundingMode;
  interest?: RoundingMode;
  balance?: RoundingMode;
}

export interface BalloonConfig {
  balloonPercentage?: number;
  amortizationPeriodInYears?: number;
}

export interface AmortizationInput {
  principal: number;
  annualInterestRate: number;
  termInYears: number;

  frequency?: PaymentFrequency;
  loanType?: LoanType;

  rateSchedule?: RateAdjustment[];
  extraPayments?: ExtraPayment[];
  balloon?: BalloonConfig;

  fees?: number;
  closingCosts?: number;
  includeClosingCostsInLoan?: boolean;
  propertyValue?: number;
  pmiRate?: number;
  escrowMonthly?: number;
  yearlyBreakdown?: boolean;

  roundingPolicy?: RoundingPolicy;
  roundingTiming?: RoundingTiming;
  decimalPlaces?: number;
}

export interface AmortizationScheduleItem {
  period: number;
  payment: number;
  principalPaid: number;
  interestPaid: number;
  remainingBalance: number;
  extraPayment: number;
  annualInterestRate: number;
  pmiPayment?: number;
  escrowPayment?: number;
  totalPayment?: number;
}

export interface AmortizationYearlyBreakdown {
  year: number;
  principalPaid: number;
  interestPaid: number;
  pmiPaid: number;
  escrowPaid: number;
  totalPayment: number;
  remainingBalance: number;
}

export interface AmortizationResult {
  periodicPayment: number;
  totalInterestPaid: number;
  totalPaid: number;
  totalPaymentWithFees?: number;
  totalCashOutlay?: number;
  actualPeriods: number;
  balloonPayment: number;
  fees?: number;
  closingCosts?: number;
  totalPmiPaid?: number;
  totalEscrowPaid?: number;
  yearlyBreakdown?: AmortizationYearlyBreakdown[];
  schedule: AmortizationScheduleItem[];
}