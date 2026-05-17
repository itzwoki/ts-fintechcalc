import { describe, it, expect } from "vitest";
import {
  effectiveAnnualRate,
  effectiveAnnualRateToNominalRate,
  futureValue,
  internalRateOfReturn,
  nominalRateFromEffectiveAnnualRate,
  netPresentValue,
  presentValue
} from "../src/finance-utils";

describe("Finance Utilities", () => {
  it("calculates present value for a lump sum", () => {
    expect(presentValue({ futureValue: 110, rate: 0.1, periods: 1 })).toBeCloseTo(100, 10);
  });

  it("calculates future value for a lump sum", () => {
    expect(futureValue({ presentValue: 100, rate: 0.1, periods: 1 })).toBeCloseTo(110, 10);
  });

  it("calculates present value for an ordinary annuity", () => {
    expect(presentValue({ payment: 100, rate: 0.05, periods: 3 })).toBeCloseTo(272.32, 2);
  });

  it("calculates future value for an annuity due", () => {
    expect(futureValue({ payment: 100, rate: 0.05, periods: 3, paymentTiming: "BEGIN" })).toBeCloseTo(331.0125, 6);
  });

  it("calculates net present value for a simple project", () => {
    const npvValue = netPresentValue(0.1, [-100, 60, 60, 60]);
    expect(npvValue).toBeCloseTo(49.2111, 4);
  });

  it("calculates internal rate of return for a simple project", () => {
    const irr = internalRateOfReturn([-100, 60, 60, 60]);
    expect(irr).toBeCloseTo(0.3631, 4);
  });

  it("calculates effective annual rate from nominal APR", () => {
    expect(effectiveAnnualRate(0.1, 4)).toBeCloseTo(0.10381289, 8);
  });

  it("converts effective annual rate back to nominal rate", () => {
    const nominal = nominalRateFromEffectiveAnnualRate(0.10381289, 4);
    expect(nominal).toBeCloseTo(0.1, 8);
  });

  it("supports APR to effective annual rate and back", () => {
    expect(effectiveAnnualRateToNominalRate(0.10381289, 4)).toBeCloseTo(0.1, 8);
  });
});
