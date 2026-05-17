import { AmortizationInput } from "../amortization/types";

export function validateAmortizationInput(input: AmortizationInput): void {

  if (input.principal <= 0) {
    throw new Error("Principal must be greater than zero.");
  }

  if (input.termInYears <= 0) {
    throw new Error("Loan term must be greater than zero.");
  }

  if (input.annualInterestRate < 0) {
    throw new Error("Interest rate cannot be negative.");
  }

  if (input.extraPayments) {
    input.extraPayments.forEach(e => {
      if (e.amount < 0) {
        throw new Error("Extra payment cannot be negative.");
      }
      if (e.period <= 0) {
        throw new Error("Extra payment period must be positive.");
      }
    });
  }

  if (input.rateSchedule) {
    const periods = new Set<number>();

    input.rateSchedule.forEach(r => {
      if (r.fromPeriod <= 0) {
        throw new Error("Rate adjustment period must be positive.");
      }
      if (r.annualInterestRate < 0) {
        throw new Error("Adjusted rate cannot be negative.");
      }
      if (periods.has(r.fromPeriod)) {
        throw new Error("Duplicate rate adjustment period detected.");
      }
      periods.add(r.fromPeriod);
    });

    const sorted = [...input.rateSchedule].sort(
      (a, b) => a.fromPeriod - b.fromPeriod
    );

    input.rateSchedule.forEach((r, i) => {
      if (r.fromPeriod !== sorted[i].fromPeriod) {
        throw new Error("Rate schedule must be sorted by fromPeriod ascending.");
      }
    });
  }

  if (input.balloon) {
    const { balloonPercentage, amortizationPeriodInYears } = input.balloon;

    if (
      balloonPercentage !== undefined &&
      amortizationPeriodInYears !== undefined
    ) {
      throw new Error(
        "Provide either balloonPercentage or amortizationPeriodInYears, not both."
      );
    }

    if (balloonPercentage !== undefined) {
      if (balloonPercentage <= 0 || balloonPercentage >= 1) {
        throw new Error("balloonPercentage must be between 0 and 1 (exclusive).");
      }
    }

    if (amortizationPeriodInYears !== undefined) {
      if (amortizationPeriodInYears <= input.termInYears) {
        throw new Error("amortizationPeriodInYears must exceed loan termInYears.");
      }
    }
  }

  if (input.fees !== undefined && input.fees < 0) {
    throw new Error("Fees cannot be negative.");
  }

  if (input.closingCosts !== undefined && input.closingCosts < 0) {
    throw new Error("Closing costs cannot be negative.");
  }

  if (input.escrowMonthly !== undefined && input.escrowMonthly < 0) {
    throw new Error("Escrow monthly amount cannot be negative.");
  }

  if (input.pmiRate !== undefined) {
    if (input.pmiRate < 0 || input.pmiRate >= 1) {
      throw new Error("PMI rate must be between 0 and 1 (exclusive).");
    }
    if (input.propertyValue !== undefined && input.propertyValue <= 0) {
      throw new Error("Property value must be greater than zero when PMI rate is provided.");
    }
  }

  if (input.propertyValue !== undefined && input.propertyValue <= 0) {
    throw new Error("Property value must be greater than zero.");
  }
}
