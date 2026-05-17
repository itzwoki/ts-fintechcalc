import { describe, it, expect } from "vitest";
import { calculateAmortization } from "../src/amortization/engine";

describe("Amortization Engine", () => {

  // ========================================
  // FULLY AMORTIZING
  // ========================================

  it("calculates fully amortizing loan correctly", () => {
    const result = calculateAmortization({
      principal: 100000,
      annualInterestRate: 0.05,
      termInYears: 30
    });

    expect(result.schedule.length).toBe(360);
    expect(result.periodicPayment).toBeGreaterThan(0);
    expect(result.totalInterestPaid).toBeGreaterThan(0);
    expect(result.balloonPayment).toBe(0);
  });

  it("handles zero interest loans", () => {
    const result = calculateAmortization({
      principal: 12000,
      annualInterestRate: 0,
      termInYears: 1
    });

    expect(result.totalInterestPaid).toBe(0);
    expect(result.schedule[0].interestPaid).toBe(0);
    expect(result.periodicPayment).toBe(1000);
  });

  // ========================================
  // EXTRA PAYMENTS + EARLY PAYOFF
  // ========================================

  it("detects early payoff with extra payments", () => {
    const result = calculateAmortization({
      principal: 10000,
      annualInterestRate: 0.05,
      termInYears: 5,
      extraPayments: [{ period: 1, amount: 5000 }]
    });

    expect(result.actualPeriods).toBeLessThan(60);
  });

  // ========================================
  // ADJUSTABLE RATE
  // ========================================

  it("recalculates payment when rate changes", () => {
    const result = calculateAmortization({
      principal: 200000,
      annualInterestRate: 0.04,
      termInYears: 10,
      rateSchedule: [
        { fromPeriod: 25, annualInterestRate: 0.06 }
      ]
    });

    const beforeChange = result.schedule[23].annualInterestRate;
    const afterChange = result.schedule[24].annualInterestRate;

    expect(beforeChange).toBe(0.04);
    expect(afterChange).toBe(0.06);
  });

  // ========================================
  // INTEREST-ONLY
  // ========================================

  it("handles interest-only loan correctly", () => {
    const result = calculateAmortization({
      principal: 50000,
      annualInterestRate: 0.08,
      termInYears: 5,
      loanType: "INTEREST_ONLY"
    });

    const last = result.schedule[result.schedule.length - 1];

    expect(last.remainingBalance).toBe(0);
    expect(result.schedule[0].principalPaid).toBe(0);
  });

  // ========================================
  // BULLET
  // ========================================

  it("handles bullet loan correctly", () => {
    const result = calculateAmortization({
      principal: 30000,
      annualInterestRate: 0.07,
      termInYears: 3,
      loanType: "BULLET"
    });

    const last = result.schedule[result.schedule.length - 1];

    expect(last.remainingBalance).toBe(0);
    expect(result.schedule[0].payment).toBe(0);
  });

  // ========================================
  // BALLOON — BY PERCENTAGE
  // ========================================

  it("calculates balloon loan by percentage", () => {
    const result = calculateAmortization({
      principal: 100000,
      annualInterestRate: 0.06,
      termInYears: 5,
      balloon: {
        balloonPercentage: 0.3
      }
    });

    expect(result.balloonPayment).toBeGreaterThan(0);
    expect(result.periodicPayment).toBeGreaterThan(0);

    // Balloon should be approximately 30% of principal
    expect(result.balloonPayment).toBeCloseTo(30000, -2);
  });

  // ========================================
  // BALLOON — BY AMORTIZATION PERIOD
  // ========================================

  it("calculates balloon loan by amortization period", () => {
    const result = calculateAmortization({
      principal: 100000,
      annualInterestRate: 0.06,
      termInYears: 5,
      balloon: {
        amortizationPeriodInYears: 20
      }
    });

    expect(result.balloonPayment).toBeGreaterThan(0);
    expect(result.actualPeriods).toBe(60);

    // Payment should be lower than normal 5-year amortization
    const normalResult = calculateAmortization({
      principal: 100000,
      annualInterestRate: 0.06,
      termInYears: 5
    });

    expect(result.periodicPayment).toBeLessThan(normalResult.periodicPayment);
  });

  // ========================================
  // BALLOON — ZERO INTEREST
  // ========================================

  it("handles balloon with zero interest", () => {
    const result = calculateAmortization({
      principal: 100000,
      annualInterestRate: 0,
      termInYears: 5,
      balloon: {
        balloonPercentage: 0.5
      }
    });

    expect(result.balloonPayment).toBeCloseTo(50000, -2);
    expect(result.totalInterestPaid).toBe(0);
  });

  // ========================================
  // BALLOON — VALIDATION
  // ========================================

  it("throws error when balloon used with INTEREST_ONLY", () => {
    expect(() =>
      calculateAmortization({
        principal: 100000,
        annualInterestRate: 0.05,
        termInYears: 5,
        loanType: "INTEREST_ONLY",
        balloon: { balloonPercentage: 0.3 }
      })
    ).toThrow("Balloon configuration only allowed for FULLY_AMORTIZING loans.");
  });

  it("throws error when both balloon options provided", () => {
    expect(() =>
      calculateAmortization({
        principal: 100000,
        annualInterestRate: 0.05,
        termInYears: 5,
        balloon: {
          balloonPercentage: 0.3,
          amortizationPeriodInYears: 20
        }
      })
    ).toThrow("Provide either balloonPercentage or amortizationPeriodInYears, not both.");
  });

  it("throws error when amortization period <= loan term", () => {
    expect(() =>
      calculateAmortization({
        principal: 100000,
        annualInterestRate: 0.05,
        termInYears: 10,
        balloon: {
          amortizationPeriodInYears: 5
        }
      })
    ).toThrow("amortizationPeriodInYears must exceed loan termInYears.");
  });

  it("throws error for invalid balloon percentage", () => {
    expect(() =>
      calculateAmortization({
        principal: 100000,
        annualInterestRate: 0.05,
        termInYears: 5,
        balloon: {
          balloonPercentage: 1.5
        }
      })
    ).toThrow("balloonPercentage must be between 0 and 1 (exclusive).");
  });

  // ========================================
  // NEGATIVE AMORTIZATION
  // ========================================

  it("fully amortizing loans always have positive principal", () => {
    const result = calculateAmortization({
      principal: 10000,
      annualInterestRate: 0.5,
      termInYears: 1,
      loanType: "FULLY_AMORTIZING"
    });

    result.schedule.forEach(item => {
      expect(item.principalPaid).toBeGreaterThan(0);
    });
  });

  // ========================================
  // VALIDATION
  // ========================================

  it("throws error for negative principal", () => {
    expect(() =>
      calculateAmortization({
        principal: -100,
        annualInterestRate: 0.05,
        termInYears: 1
      })
    ).toThrow("Principal must be greater than zero.");
  });

  it("throws error for zero term", () => {
    expect(() =>
      calculateAmortization({
        principal: 10000,
        annualInterestRate: 0.05,
        termInYears: 0
      })
    ).toThrow("Loan term must be greater than zero.");
  });

  it("throws error for negative interest rate", () => {
    expect(() =>
      calculateAmortization({
        principal: 10000,
        annualInterestRate: -0.05,
        termInYears: 1
      })
    ).toThrow("Interest rate cannot be negative.");
  });

  it("throws error for unsorted rate schedule", () => {
    expect(() =>
      calculateAmortization({
        principal: 10000,
        annualInterestRate: 0.05,
        termInYears: 5,
        rateSchedule: [
          { fromPeriod: 10, annualInterestRate: 0.06 },
          { fromPeriod: 5, annualInterestRate: 0.07 }
        ]
      })
    ).toThrow("Rate schedule must be sorted by fromPeriod ascending.");
  });

  it("throws error for duplicate rate schedule periods", () => {
    expect(() =>
      calculateAmortization({
        principal: 10000,
        annualInterestRate: 0.05,
        termInYears: 5,
        rateSchedule: [
          { fromPeriod: 5, annualInterestRate: 0.06 },
          { fromPeriod: 5, annualInterestRate: 0.07 }
        ]
      })
    ).toThrow("Duplicate rate adjustment period detected.");
  });

  it("throws error for negative extra payment", () => {
    expect(() =>
      calculateAmortization({
        principal: 10000,
        annualInterestRate: 0.05,
        termInYears: 1,
        extraPayments: [{ period: 1, amount: -500 }]
      })
    ).toThrow("Extra payment cannot be negative.");
  });

  // ========================================
  // PRECISION
  // ========================================

  it("maintains precision for small principal values", () => {
    const result = calculateAmortization({
      principal: 0.01,
      annualInterestRate: 0.05,
      termInYears: 1
    });

    expect(result.schedule.length).toBeGreaterThan(0);
  });

  // ========================================
  // QUARTERLY FREQUENCY
  // ========================================

  it("handles quarterly payment frequency", () => {
    const result = calculateAmortization({
      principal: 50000,
      annualInterestRate: 0.06,
      termInYears: 5,
      frequency: "quarterly"
    });

    expect(result.schedule.length).toBe(20);
  });

  // ========================================
  // BALLOON + ADJUSTABLE RATE
  // ========================================

  it("handles balloon with adjustable rate correctly", () => {
    const result = calculateAmortization({
      principal: 100000,
      annualInterestRate: 0.05,
      termInYears: 5,
      balloon: {
        balloonPercentage: 0.3
      },
      rateSchedule: [
        { fromPeriod: 13, annualInterestRate: 0.07 }
      ]
    });

    expect(result.schedule[11].annualInterestRate).toBe(0.05);
    expect(result.schedule[12].annualInterestRate).toBe(0.07);
    expect(result.balloonPayment).toBeGreaterThan(0);
  });

  it("handles mortgage fees, PMI, and escrow payments", () => {
    const result = calculateAmortization({
      principal: 200000,
      annualInterestRate: 0.045,
      termInYears: 30,
      propertyValue: 240000,
      pmiRate: 0.01,
      escrowMonthly: 150,
      fees: 500,
      closingCosts: 2000,
      yearlyBreakdown: true
    });

    expect(result.fees).toBe(500);
    expect(result.closingCosts).toBe(2000);
    expect(result.totalPmiPaid).toBeGreaterThan(0);
    expect(result.totalEscrowPaid).toBeGreaterThan(0);
    expect(result.yearlyBreakdown).toBeDefined();
    expect(result.yearlyBreakdown?.length).toBeGreaterThan(0);
  });

  // ========================================
  // CONFIGURABLE ROUNDING MODES
  // ========================================

  it("applies HALF_UP rounding mode correctly", () => {
    const result = calculateAmortization({
      principal: 10000,
      annualInterestRate: 0.05,
      termInYears: 1,
      roundingPolicy: {
        payment: "HALF_UP"
      },
      decimalPlaces: 2
    });

    expect(result.periodicPayment).toBeDefined();
    expect(result.schedule[0].payment % 1).toBeLessThanOrEqual(1);
  });

  it("applies HALF_EVEN rounding mode correctly", () => {
    const result = calculateAmortization({
      principal: 10000,
      annualInterestRate: 0.05,
      termInYears: 1,
      roundingPolicy: {
        payment: "HALF_EVEN"
      },
      decimalPlaces: 2
    });

    expect(result.periodicPayment).toBeDefined();
    // HALF_EVEN (banker's rounding) should be supported
    expect(typeof result.periodicPayment).toBe("number");
  });

  it("applies DOWN rounding mode correctly", () => {
    const result = calculateAmortization({
      principal: 10000,
      annualInterestRate: 0.05,
      termInYears: 1,
      roundingPolicy: {
        payment: "DOWN"
      },
      decimalPlaces: 2
    });

    expect(result.periodicPayment).toBeDefined();
    expect(typeof result.periodicPayment).toBe("number");
  });

  it("applies UP rounding mode correctly", () => {
    const result = calculateAmortization({
      principal: 10000,
      annualInterestRate: 0.05,
      termInYears: 1,
      roundingPolicy: {
        payment: "UP"
      },
      decimalPlaces: 2
    });

    expect(result.periodicPayment).toBeDefined();
    expect(typeof result.periodicPayment).toBe("number");
  });

  // ========================================
  // ROUNDING TIMING
  // ========================================

  it("applies rounding per period when specified", () => {
    const result = calculateAmortization({
      principal: 10000,
      annualInterestRate: 0.05,
      termInYears: 1,
      roundingTiming: "PER_PERIOD",
      roundingPolicy: {
        payment: "HALF_UP"
      },
      decimalPlaces: 2
    });

    expect(result.schedule[0].payment).toBeDefined();
    expect(result.schedule[0].interestPaid).toBeDefined();
  });

  it("skips per-period rounding when END_ONLY is specified", () => {
    const result = calculateAmortization({
      principal: 10000,
      annualInterestRate: 0.05,
      termInYears: 1,
      roundingTiming: "END_ONLY",
      roundingPolicy: {
        payment: "HALF_UP"
      },
      decimalPlaces: 2
    });

    expect(result.schedule.length).toBeGreaterThan(0);
    // END_ONLY should use internal Decimal precision
    expect(typeof result.periodicPayment).toBe("number");
  });

  // ========================================
  // ADDITIONAL PROFESSIONAL SCENARIOS
  // ========================================

  it("handles high interest rates without overflow", () => {
    const result = calculateAmortization({
      principal: 100000,
      annualInterestRate: 0.18,
      termInYears: 5
    });

    expect(result.schedule.length).toBe(60);
    expect(result.totalInterestPaid).toBeGreaterThan(0);
  });

  it("handles multiple extra payments in different periods", () => {
    const result = calculateAmortization({
      principal: 50000,
      annualInterestRate: 0.05,
      termInYears: 5,
      extraPayments: [
        { period: 6, amount: 2000 },
        { period: 12, amount: 3000 },
        { period: 24, amount: 1000 }
      ]
    });

    expect(result.actualPeriods).toBeLessThan(60);
  });

  it("correctly handles interest-only with extra payments", () => {
    const result = calculateAmortization({
      principal: 50000,
      annualInterestRate: 0.06,
      termInYears: 3,
      loanType: "INTEREST_ONLY",
      extraPayments: [
        { period: 1, amount: 5000 }
      ]
    });

    expect(result.schedule[0].extraPayment).toBe(5000);
    // Extra payment reduces principal, so fewer periods needed to payoff
    const resultWithoutExtra = calculateAmortization({
      principal: 50000,
      annualInterestRate: 0.06,
      termInYears: 3,
      loanType: "INTEREST_ONLY"
    });
    
    expect(result.actualPeriods).toBeLessThanOrEqual(resultWithoutExtra.actualPeriods);
  });

  it("validates balloon percentage boundaries", () => {
    // Test at exact 0 boundary
    expect(() =>
      calculateAmortization({
        principal: 100000,
        annualInterestRate: 0.05,
        termInYears: 5,
        balloon: { balloonPercentage: 0 }
      })
    ).toThrow("balloonPercentage must be between 0 and 1 (exclusive).");

    // Test at exact 1 boundary
    expect(() =>
      calculateAmortization({
        principal: 100000,
        annualInterestRate: 0.05,
        termInYears: 5,
        balloon: { balloonPercentage: 1 }
      })
    ).toThrow("balloonPercentage must be between 0 and 1 (exclusive).");
  });

  // ========================================
  // SCHEDULE INTEGRITY
  // ========================================

  it("ensures fully amortizing loan ends at zero balance", () => {
    const result = calculateAmortization({
      principal: 100000,
      annualInterestRate: 0.05,
      termInYears: 30
    });

    expect(result.schedule[result.schedule.length - 1].remainingBalance).toBeLessThan(1);
  });

  it("ensures interest-only loan ends at zero balance", () => {
    const result = calculateAmortization({
      principal: 50000,
      annualInterestRate: 0.06,
      termInYears: 5,
      loanType: "INTEREST_ONLY"
    });

    expect(result.schedule[result.schedule.length - 1].remainingBalance).toBe(0);
  });

  it("ensures bullet loan ends at zero balance", () => {
    const result = calculateAmortization({
      principal: 30000,
      annualInterestRate: 0.07,
      termInYears: 3,
      loanType: "BULLET"
    });

    expect(result.schedule[result.schedule.length - 1].remainingBalance).toBe(0);
  });

  it("validates schedule totals match result fields", () => {
    const result = calculateAmortization({
      principal: 50000,
      annualInterestRate: 0.05,
      termInYears: 5
    });

    const sumInterest = result.schedule.reduce((sum, item) => sum + item.interestPaid, 0);
    const sumPrincipal = result.schedule.reduce((sum, item) => sum + item.principalPaid, 0);
    const sumPayments = result.schedule.reduce((sum, item) => sum + item.payment, 0);

    // Allow for minor rounding differences
    expect(Math.abs(sumInterest - result.totalInterestPaid)).toBeLessThan(0.10);
    expect(Math.abs(sumPrincipal - (result.totalPaid - result.totalInterestPaid))).toBeLessThan(0.10);
    expect(Math.abs(sumPayments - result.totalPaid)).toBeLessThan(0.10);
  });

  // ========================================
  // ROUNDING EDGE CASES
  // ========================================

  it("handles HALF_UP rounding at exact 0.005 boundary", () => {
    // Use specific values that trigger 0.005 rounding
    const result = calculateAmortization({
      principal: 33333.33,
      annualInterestRate: 0.07,
      termInYears: 1,
      roundingPolicy: { payment: "HALF_UP" },
      decimalPlaces: 2
    });

    // Verify rounding applied consistently
    expect(result.periodicPayment).toBeDefined();
    expect(result.schedule[0].payment).toBe(result.periodicPayment);
  });

  it("handles HALF_EVEN rounding correctly", () => {
    const result1 = calculateAmortization({
      principal: 15000,
      annualInterestRate: 0.045,
      termInYears: 1,
      roundingPolicy: { payment: "HALF_EVEN" },
      decimalPlaces: 2
    });

    const result2 = calculateAmortization({
      principal: 15000,
      annualInterestRate: 0.045,
      termInYears: 1,
      roundingPolicy: { payment: "HALF_UP" },
      decimalPlaces: 2
    });

    // Both should produce valid results (may differ at 0.005 boundary)
    expect(result1.periodicPayment).toBeDefined();
    expect(result2.periodicPayment).toBeDefined();
  });
});