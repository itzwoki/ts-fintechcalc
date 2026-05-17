import { Decimal } from "../core/decimal";
import { FutureValueInput, PaymentTiming, PresentValueInput } from "./types";

function ensureFinite(value: number, name: string): Decimal {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number.`);
  }
  return new Decimal(value);
}

function validatePeriods(periods: number): void {
  if (!Number.isFinite(periods) || periods < 0) {
    throw new Error("Periods must be a non-negative finite number.");
  }
}

function validateCompoundingPeriods(periods: number): void {
  if (!Number.isFinite(periods) || periods <= 0 || !Number.isInteger(periods)) {
    throw new Error("Compounding periods must be a positive integer.");
  }
}

function annuityFactor(rate: Decimal, periods: number): Decimal {
  if (rate.equals(0)) {
    return new Decimal(periods);
  }

  const factor = rate.plus(1).pow(periods);
  return factor.minus(1).div(rate);
}

function annuityPresentValueFactor(rate: Decimal, periods: number): Decimal {
  if (rate.equals(0)) {
    return new Decimal(periods);
  }

  const factor = rate.plus(1).pow(periods);
  return new Decimal(1).minus(factor.negated().pow(1)).div(rate).mul(factor.negated().pow(1));
}

function annuityPresentValue(payment: Decimal, rate: Decimal, periods: number, timing: PaymentTiming): Decimal {
  if (rate.equals(0)) {
    return payment.mul(periods);
  }

  const factor = new Decimal(1).minus(rate.plus(1).pow(-periods)).div(rate);
  return timing === "BEGIN" ? payment.mul(factor).mul(rate.plus(1)) : payment.mul(factor);
}

function annuityFutureValue(payment: Decimal, rate: Decimal, periods: number, timing: PaymentTiming): Decimal {
  if (rate.equals(0)) {
    return payment.mul(periods);
  }

  const factor = rate.plus(1).pow(periods).minus(1).div(rate);
  return timing === "BEGIN" ? payment.mul(factor).mul(rate.plus(1)) : payment.mul(factor);
}

export function presentValue(params: PresentValueInput): number {
  const { futureValue = 0, payment = 0, rate, periods, paymentTiming = "END" } = params;

  validatePeriods(periods);
  const rateDecimal = ensureFinite(rate, "Rate");

  if (futureValue === undefined && payment === undefined) {
    throw new Error("Provide a future value or payment amount to calculate present value.");
  }

  const fvValue = ensureFinite(futureValue, "Future value");
  const paymentValue = ensureFinite(payment, "Payment");

  const presentValueFromFuture = fvValue.div(rateDecimal.plus(1).pow(periods));
  const presentValueFromAnnuity = annuityPresentValue(paymentValue, rateDecimal, periods, paymentTiming);

  return presentValueFromFuture.plus(presentValueFromAnnuity).toNumber();
}

export function futureValue(params: FutureValueInput): number {
  const { presentValue = 0, payment = 0, rate, periods, paymentTiming = "END" } = params;

  validatePeriods(periods);
  const rateDecimal = ensureFinite(rate, "Rate");

  if (presentValue === undefined && payment === undefined) {
    throw new Error("Provide a present value or payment amount to calculate future value.");
  }

  const pvValue = ensureFinite(presentValue, "Present value");
  const paymentValue = ensureFinite(payment, "Payment");

  const futureValueFromPresent = pvValue.mul(rateDecimal.plus(1).pow(periods));
  const futureValueFromAnnuity = annuityFutureValue(paymentValue, rateDecimal, periods, paymentTiming);

  return futureValueFromPresent.plus(futureValueFromAnnuity).toNumber();
}

export function netPresentValue(rate: number, cashFlows: number[]): number {
  if (!Array.isArray(cashFlows) || cashFlows.length === 0) {
    throw new Error("Cash flows must be a non-empty array.");
  }

  const rateDecimal = ensureFinite(rate, "Discount rate");
  if (rateDecimal.equals(-1)) {
    throw new Error("Discount rate cannot equal -100%.");
  }

  return cashFlows.reduce((acc, flow, index) => {
    const flowValue = ensureFinite(flow, `Cash flow[${index}]`);
    return acc.plus(flowValue.div(rateDecimal.plus(1).pow(index)));
  }, new Decimal(0)).toNumber();
}

function npvAtRate(cashFlows: Decimal[], rate: Decimal): Decimal {
  return cashFlows.reduce((sum, flow, index) => {
    return sum.plus(flow.div(rate.plus(1).pow(index)));
  }, new Decimal(0));
}

export function internalRateOfReturn(cashFlows: number[], guess = 0.1): number {
  if (!Array.isArray(cashFlows) || cashFlows.length < 2) {
    throw new Error("Cash flows must include at least one initial investment and one return.");
  }

  const decimalFlows = cashFlows.map((flow, index) => {
    if (!Number.isFinite(flow)) {
      throw new Error(`Cash flow[${index}] must be a finite number.`);
    }
    return new Decimal(flow);
  });

  const hasPositive = decimalFlows.some(flow => flow.gt(0));
  const hasNegative = decimalFlows.some(flow => flow.lt(0));
  if (!hasPositive || !hasNegative) {
    throw new Error("Cash flows must contain at least one positive and one negative value.");
  }

  let low = new Decimal(-0.999999999);
  let high = new Decimal(1);
  let lowValue = npvAtRate(decimalFlows, low);
  let highValue = npvAtRate(decimalFlows, high);
  let attempts = 0;

  while (lowValue.mul(highValue).gte(0) && attempts < 100) {
    high = high.times(2).plus(1);
    highValue = npvAtRate(decimalFlows, high);
    attempts += 1;
  }

  if (lowValue.mul(highValue).gte(0)) {
    throw new Error("Unable to bracket IRR. Check the cash flow pattern.");
  }

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const mid = low.plus(high).div(2);
    const midValue = npvAtRate(decimalFlows, mid);

    if (midValue.abs().lte(new Decimal(10).pow(-12))) {
      return mid.toNumber();
    }

    if (midValue.mul(lowValue).gt(0)) {
      low = mid;
      lowValue = midValue;
    } else {
      high = mid;
      highValue = midValue;
    }
  }

  return low.plus(high).div(2).toNumber();
}

export function effectiveAnnualRate(nominalRate: number, compoundingPeriods: number): number {
  validateCompoundingPeriods(compoundingPeriods);

  const rateDecimal = ensureFinite(nominalRate, "Nominal rate");
  const periodRate = rateDecimal.div(compoundingPeriods);

  return periodRate.plus(1).pow(compoundingPeriods).minus(1).toNumber();
}

export function nominalRateFromEffectiveAnnualRate(effectiveAnnualRate: number, compoundingPeriods: number): number {
  validateCompoundingPeriods(compoundingPeriods);

  const effective = ensureFinite(effectiveAnnualRate, "Effective annual rate");
  if (effective.equals(-1)) {
    throw new Error("Effective annual rate cannot equal -100%.");
  }

  return effective
    .plus(1)
    .pow(new Decimal(1).div(compoundingPeriods))
    .minus(1)
    .mul(compoundingPeriods)
    .toNumber();
}

export function aprToEffectiveAnnualRate(apr: number, compoundingPeriods: number): number {
  return effectiveAnnualRate(apr, compoundingPeriods);
}

export function effectiveAnnualRateToNominalRate(effectiveAnnualRate: number, compoundingPeriods: number): number {
  return nominalRateFromEffectiveAnnualRate(effectiveAnnualRate, compoundingPeriods);
}
