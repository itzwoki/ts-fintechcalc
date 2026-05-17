import { Decimal } from "../core/decimal";
import { applyRounding } from "../core/rounding";
import { validateAmortizationInput } from "./validation";

import {
  AmortizationInput,
  AmortizationResult,
  AmortizationScheduleItem
} from "./types";


// ✅ Utility: frequency → periods per year
function getPeriodsPerYear(freq: string): number {
  return freq === "monthly" ? 12 : 4;
}


// ✅ Core: Calculate fixed periodic payment
// Supports normal, balloon percentage, and amortization-period balloon
function calculateFixedPayment(
  principal: Decimal,
  periodicRate: Decimal,
  totalPeriods: number,
  balloonAmount?: Decimal,
  amortizationPeriods?: number
): Decimal {

  // Zero interest
  if (periodicRate.equals(0)) {
    if (balloonAmount) {
      return principal.minus(balloonAmount).div(totalPeriods);
    }
    return principal.div(totalPeriods);
  }

  // Balloon by amortization period
  // Payment calculated using longer amortization schedule
  // Loan stops at actual term → remaining balance = balloon
  if (amortizationPeriods !== undefined) {
    const factor = periodicRate.plus(1).pow(amortizationPeriods);
    return principal
      .mul(periodicRate)
      .mul(factor)
      .div(factor.minus(1));
  }

  // Balloon by percentage
  // Reduce effective principal by present value of balloon
  if (balloonAmount) {
    const balloonPV = balloonAmount.div(
      periodicRate.plus(1).pow(totalPeriods)
    );

    const effectivePrincipal = principal.minus(balloonPV);
    const factor = periodicRate.plus(1).pow(totalPeriods);

    return effectivePrincipal
      .mul(periodicRate)
      .mul(factor)
      .div(factor.minus(1));
  }

  // Standard fully amortizing
  const factor = periodicRate.plus(1).pow(totalPeriods);
  return principal
    .mul(periodicRate)
    .mul(factor)
    .div(factor.minus(1));
}

function calculatePmi(
  balance: Decimal,
  originalPrincipal: Decimal,
  propertyValue?: Decimal,
  pmiRate?: Decimal,
  periodsPerYear?: number
): Decimal {
  if (!pmiRate || pmiRate.equals(0) || !periodsPerYear) {
    return new Decimal(0);
  }

  if (propertyValue && balance.lte(propertyValue.mul(0.8))) {
    return new Decimal(0);
  }

  const annualPmi = originalPrincipal.mul(pmiRate);
  return annualPmi.div(periodsPerYear);
}


// ✅ Main engine
export function calculateAmortization(
  input: AmortizationInput
): AmortizationResult {

  // ✅ Validate all inputs
  validateAmortizationInput(input);

  const {
    principal,
    annualInterestRate,
    termInYears,
    frequency = "monthly",
    loanType = "FULLY_AMORTIZING",
    rateSchedule = [],
    extraPayments = [],
    fees = 0,
    closingCosts = 0,
    includeClosingCostsInLoan = false,
    propertyValue,
    pmiRate,
    escrowMonthly = 0,
    yearlyBreakdown = false,
    roundingPolicy = {},
    roundingTiming = "PER_PERIOD",
    decimalPlaces = 2
  } = input;

  // ✅ Balloon only allowed for FULLY_AMORTIZING
  if (input.balloon && loanType !== "FULLY_AMORTIZING") {
    throw new Error(
      "Balloon configuration only allowed for FULLY_AMORTIZING loans."
    );
  }

  const periodsPerYear = getPeriodsPerYear(frequency);
  const totalPeriods = termInYears * periodsPerYear;

  const P = new Decimal(principal);
  const feesAmount = new Decimal(fees);
  const closingCostsAmount = new Decimal(closingCosts);
  const financedClosingCosts = includeClosingCostsInLoan ? closingCostsAmount : new Decimal(0);
  const originalLoanAmount = P;
  const loanPrincipal = P.plus(financedClosingCosts);
  let balance = loanPrincipal;
  let totalInterestPaid = new Decimal(0);
  let totalInterestPaidRounded = new Decimal(0);
  let totalPaidRounded = new Decimal(0);
  let totalPmiPaid = new Decimal(0);
  let totalEscrowPaid = new Decimal(0);
  const propertyValueAmount = propertyValue !== undefined ? new Decimal(propertyValue) : undefined;
  const pmiRateAmount = pmiRate !== undefined ? new Decimal(pmiRate) : new Decimal(0);
  const escrowPerPeriod = new Decimal(escrowMonthly);
  const yearlyTotals: Array<{
    year: number;
    principalPaid: Decimal;
    interestPaid: Decimal;
    pmiPaid: Decimal;
    escrowPaid: Decimal;
    totalPayment: Decimal;
    remainingBalance: Decimal;
  }> = [];

  // ✅ O(1) extra payment lookup
  const extraMap = new Map<number, Decimal>();
  extraPayments.forEach(e => {
    extraMap.set(e.period, new Decimal(e.amount));
  });

  // ✅ Deterministic rate resolution
  const rateMap = new Map<number, Decimal>();
  rateSchedule.forEach(r => {
    rateMap.set(r.fromPeriod, new Decimal(r.annualInterestRate));
  });

  let activeAnnualRate = new Decimal(annualInterestRate);
  let periodicRate = activeAnnualRate.div(periodsPerYear);

  // ✅ Resolve balloon config
  let balloonAmount: Decimal | undefined;
  let amortizationPeriods: number | undefined;

  if (input.balloon) {
    const { balloonPercentage, amortizationPeriodInYears } = input.balloon;

    if (balloonPercentage !== undefined) {
      balloonAmount = P.mul(balloonPercentage);
    }

    if (amortizationPeriodInYears !== undefined) {
      amortizationPeriods = amortizationPeriodInYears * periodsPerYear;
    }
  }

  // ✅ Calculate initial fixed payment
  let fixedPayment =
    loanType === "FULLY_AMORTIZING"
      ? calculateFixedPayment(
          loanPrincipal,
          periodicRate,
          totalPeriods,
          balloonAmount,
          amortizationPeriods
        )
      : new Decimal(0);

  const schedule: AmortizationScheduleItem[] = [];

  for (let period = 1; period <= totalPeriods; period++) {

    if (balance.lte(0)) break;

    // Validate: balance should never go negative
    if (balance.isNegative()) {
      throw new Error(`Balance went negative at period ${period}. Check input parameters.`);
    }

    // ✅ Apply rate change if scheduled
    if (rateMap.has(period)) {
      activeAnnualRate = rateMap.get(period)!;
      periodicRate = activeAnnualRate.div(periodsPerYear);

      // ✅ Recalculate payment preserving balloon config
      if (loanType === "FULLY_AMORTIZING") {
        const remainingPeriods = totalPeriods - period + 1;

        fixedPayment = calculateFixedPayment(
          balance,
          periodicRate,
          remainingPeriods,
          balloonAmount,
          amortizationPeriods !== undefined
            ? amortizationPeriods - period + 1
            : undefined
        );
      }
    }

    let interest = balance.mul(periodicRate);

    let basePayment = new Decimal(0);
    let principalPaid = new Decimal(0);

    // ✅ FULLY_AMORTIZING
    if (loanType === "FULLY_AMORTIZING") {
      basePayment = fixedPayment;
    }

    // ✅ INTEREST_ONLY
    if (loanType === "INTEREST_ONLY") {
      basePayment = interest;

      if (period === totalPeriods) {
        principalPaid = balance;
        basePayment = basePayment.plus(balance);
      }
    }

    // ✅ BULLET
    if (loanType === "BULLET") {
      if (period === totalPeriods) {
        interest = balance.mul(periodicRate);
        principalPaid = balance;
        basePayment = interest.plus(balance);
      }
    }

    // ✅ Extra payment
    const extra = extraMap.get(period) ?? new Decimal(0);

    const pmiPayment = calculatePmi(
      balance,
      originalLoanAmount,
      propertyValueAmount,
      pmiRateAmount,
      periodsPerYear
    );

    const basePaymentThisPeriod = basePayment.plus(extra);
    const totalPaymentThisPeriod = basePaymentThisPeriod.plus(pmiPayment).plus(escrowPerPeriod);

    // ✅ FULLY_AMORTIZING principal = payment - interest
    if (loanType === "FULLY_AMORTIZING") {
      principalPaid = basePaymentThisPeriod.minus(interest);

      // ✅ Negative amortization detection
      if (principalPaid.lte(0)) {
        throw new Error(
          `Negative amortization detected at period ${period}.`
        );
      }
    }

    // ✅ For non-amortizing types, apply extra to principal
    if (loanType !== "FULLY_AMORTIZING") {
      principalPaid = principalPaid.plus(extra);
    }

    // ✅ Cap principal at remaining balance
    if (principalPaid.gt(balance)) {
      principalPaid = balance;
    }

    balance = balance.minus(principalPaid);
    totalInterestPaid = totalInterestPaid.plus(interest);
    totalPmiPaid = totalPmiPaid.plus(pmiPayment);
    totalEscrowPaid = totalEscrowPaid.plus(escrowPerPeriod);

    // ✅ Apply rounding based on timing policy
    let outputInterest = interest;
    let outputPayment = basePaymentThisPeriod;
    let outputPrincipal = principalPaid;
    let outputBalance = balance.isNegative() ? new Decimal(0) : balance;
    let outputPmi = pmiPayment;
    let outputEscrow = escrowPerPeriod;
    let outputTotalPayment = totalPaymentThisPeriod;

    // PER_PERIOD: Round each field during loop
    // END_ONLY: Keep full Decimal precision throughout, only round final outputs
    if (roundingTiming === "PER_PERIOD") {
      outputInterest = applyRounding(
        interest,
        decimalPlaces,
        roundingPolicy.interest ?? "HALF_UP"
      );

      outputPmi = applyRounding(
        pmiPayment,
        decimalPlaces,
        roundingPolicy.payment ?? "HALF_UP"
      );

      outputEscrow = applyRounding(
        escrowPerPeriod,
        decimalPlaces,
        roundingPolicy.payment ?? "HALF_UP"
      );

      outputPayment = applyRounding(
        basePaymentThisPeriod,
        decimalPlaces,
        roundingPolicy.payment ?? "HALF_UP"
      );

      outputTotalPayment = applyRounding(
        totalPaymentThisPeriod,
        decimalPlaces,
        roundingPolicy.payment ?? "HALF_UP"
      );

      outputPrincipal = applyRounding(
        principalPaid,
        decimalPlaces,
        roundingPolicy.payment ?? "HALF_UP"
      );

      outputBalance = applyRounding(
        outputBalance,
        decimalPlaces,
        roundingPolicy.balance ?? "HALF_UP"
      );

      // Track rounded totals for comparison
      totalInterestPaidRounded = totalInterestPaidRounded.plus(outputInterest);
      totalPaidRounded = totalPaidRounded.plus(outputPayment);
    } else {
      // END_ONLY: accumulate unrounded values, will round at the end
      totalInterestPaidRounded = totalInterestPaid;
      totalPaidRounded = P.plus(totalInterestPaid);
    }

    if (yearlyBreakdown) {
      const year = Math.ceil(period / periodsPerYear);
      const yearEntry = yearlyTotals.find(entry => entry.year === year);

      if (yearEntry) {
        yearEntry.principalPaid = yearEntry.principalPaid.plus(outputPrincipal);
        yearEntry.interestPaid = yearEntry.interestPaid.plus(outputInterest);
        yearEntry.pmiPaid = yearEntry.pmiPaid.plus(outputPmi);
        yearEntry.escrowPaid = yearEntry.escrowPaid.plus(outputEscrow);
        yearEntry.totalPayment = yearEntry.totalPayment.plus(outputTotalPayment);
        yearEntry.remainingBalance = new Decimal(outputBalance);
      } else {
        yearlyTotals.push({
          year,
          principalPaid: new Decimal(outputPrincipal),
          interestPaid: new Decimal(outputInterest),
          pmiPaid: new Decimal(outputPmi),
          escrowPaid: new Decimal(outputEscrow),
          totalPayment: new Decimal(outputTotalPayment),
          remainingBalance: new Decimal(outputBalance)
        });
      }
    }

    schedule.push({
      period,
      payment: outputPayment.toNumber(),
      principalPaid: outputPrincipal.toNumber(),
      interestPaid: outputInterest.toNumber(),
      remainingBalance: outputBalance.toNumber(),
      extraPayment: extra.toNumber(),
      annualInterestRate: activeAnnualRate.toNumber(),
      pmiPayment: outputPmi.toNumber(),
      escrowPayment: outputEscrow.toNumber(),
      totalPayment: outputTotalPayment.toNumber()
    });
  }

  // ✅ Calculate actual balloon payment
  const finalBalance = schedule.length > 0
    ? schedule[schedule.length - 1].remainingBalance
    : 0;

  const totalInterestPaidResult =
    roundingTiming === "PER_PERIOD"
      ? schedule.reduce(
          (sum, item) => sum.plus(new Decimal(item.interestPaid)),
          new Decimal(0)
        )
      : totalInterestPaid;

  const totalPaidResult =
    roundingTiming === "PER_PERIOD"
      ? schedule.reduce((sum, item) => sum.plus(new Decimal(item.payment)), new Decimal(0))
      : loanPrincipal.plus(totalInterestPaid);

  const totalPaymentWithFeesResult = totalPaidResult.plus(totalPmiPaid).plus(totalEscrowPaid);
  const totalCashOutlayResult = totalPaymentWithFeesResult.plus(feesAmount).plus(
    includeClosingCostsInLoan ? new Decimal(0) : closingCostsAmount
  );

  return {
    periodicPayment: applyRounding(
      fixedPayment,
      decimalPlaces,
      roundingPolicy.payment ?? "HALF_UP"
    ).toNumber(),
    totalInterestPaid: applyRounding(
      totalInterestPaidResult,
      decimalPlaces,
      roundingPolicy.interest ?? "HALF_UP"
    ).toNumber(),
    totalPaid: applyRounding(
      totalPaidResult,
      decimalPlaces,
      roundingPolicy.payment ?? "HALF_UP"
    ).toNumber(),
    totalPaymentWithFees: applyRounding(
      totalPaymentWithFeesResult,
      decimalPlaces,
      roundingPolicy.payment ?? "HALF_UP"
    ).toNumber(),
    totalCashOutlay: applyRounding(
      totalCashOutlayResult,
      decimalPlaces,
      roundingPolicy.payment ?? "HALF_UP"
    ).toNumber(),
    actualPeriods: schedule.length,
    balloonPayment: finalBalance,
    fees: feesAmount.toNumber(),
    closingCosts: closingCostsAmount.toNumber(),
    totalPmiPaid: applyRounding(totalPmiPaid, decimalPlaces, roundingPolicy.payment ?? "HALF_UP").toNumber(),
    totalEscrowPaid: applyRounding(totalEscrowPaid, decimalPlaces, roundingPolicy.payment ?? "HALF_UP").toNumber(),
    yearlyBreakdown: yearlyBreakdown
      ? yearlyTotals.map(item => ({
          year: item.year,
          principalPaid: item.principalPaid.toNumber(),
          interestPaid: item.interestPaid.toNumber(),
          pmiPaid: item.pmiPaid.toNumber(),
          escrowPaid: item.escrowPaid.toNumber(),
          totalPayment: item.totalPayment.toNumber(),
          remainingBalance: item.remainingBalance.toNumber()
        }))
      : undefined,
    schedule
  };
}