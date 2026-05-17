import { CompoundInterestInput } from "./types";

export function validateCompoundInterestInput(input: CompoundInterestInput): void {

  if (input.principal < 0) {
    throw new Error("Principal must be non-negative.");
  }

  if (input.annualRate < 0) {
    throw new Error("Annual interest rate cannot be negative.");
  }

  if (input.years <= 0) {
    throw new Error("Years must be greater than zero.");
  }

  if (input.inflation !== undefined) {
    if (input.inflation < 0) {
      throw new Error("Inflation rate cannot be negative.");
    }
    if (input.inflation >= 1) {
      throw new Error("Inflation rate must be less than 100%.");
    }
  }

  if (input.contributions) {
    const { annualAmount, annualEscalation } = input.contributions;

    if (annualAmount < 0) {
      throw new Error("Contribution amount cannot be negative.");
    }

    if (annualEscalation !== undefined) {
      if (annualEscalation < 0 || annualEscalation >= 1) {
        throw new Error("Annual escalation must be between 0 and 1 (exclusive of 1).");
      }
    }
  }

  if (input.tax) {
    const { shortTermRate, longTermRate } = input.tax;

    if (shortTermRate !== undefined) {
      if (shortTermRate < 0 || shortTermRate > 1) {
        throw new Error("Short-term tax rate must be between 0 and 1.");
      }
    }

    if (longTermRate !== undefined) {
      if (longTermRate < 0 || longTermRate > 1) {
        throw new Error("Long-term tax rate must be between 0 and 1.");
      }
    }
  }

  if (input.decimalPlaces !== undefined) {
    if (input.decimalPlaces < 0 || input.decimalPlaces > 10) {
      throw new Error("Decimal places must be between 0 and 10.");
    }
  }
}
