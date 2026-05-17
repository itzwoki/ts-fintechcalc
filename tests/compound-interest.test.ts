import { describe, it, expect } from "vitest";
import { 
  calculateCompoundInterest, 
  compareScenarios, 
  analyzeVariableImpact 
} from "../src/compound-interest";

describe("Compound Interest Engine", () => {

  // BASIC COMPOUND INTEREST CALCULATIONS

  it("calculates simple compound interest annually", () => {
    const result = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.05,
      years: 10,
      frequency: "annual"
    });

    expect(result.finalBalance).toBeGreaterThan(16000);
    expect(result.finalBalance).toBeLessThan(16300);
    expect(result.totalInterestEarned).toBeGreaterThan(0);
  });

  it("calculates compound interest monthly", () => {
    const result = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.05,
      years: 10,
      frequency: "monthly"
    });

    // Monthly compounding yields more than annual
    const annual = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.05,
      years: 10,
      frequency: "annual"
    });

    expect(result.finalBalance).toBeGreaterThan(annual.finalBalance);
  });

  it("handles zero interest rate", () => {
    const result = calculateCompoundInterest({
      principal: 5000,
      annualRate: 0,
      years: 5,
      frequency: "monthly"
    });

    expect(result.finalBalance).toBe(5000);
    expect(result.totalInterestEarned).toBe(0);
  });

  it("handles zero principal", () => {
    const result = calculateCompoundInterest({
      principal: 0,
      annualRate: 0.05,
      years: 10,
      frequency: "monthly"
    });

    expect(result.finalBalance).toBe(0);
  });

  // COMPOUNDING FREQUENCIES

  it("demonstrates impact of different compounding frequencies", () => {
    const frequencies = ["annual", "semi-annual", "quarterly", "monthly", "daily"] as const;
    const results = frequencies.map(freq =>
      calculateCompoundInterest({
        principal: 10000,
        annualRate: 0.06,
        years: 5,
        frequency: freq
      })
    );

    // More frequent compounding = higher balance
    expect(results[0].finalBalance).toBeLessThan(results[1].finalBalance);
    expect(results[1].finalBalance).toBeLessThan(results[2].finalBalance);
    expect(results[2].finalBalance).toBeLessThan(results[3].finalBalance);
    expect(results[3].finalBalance).toBeLessThan(results[4].finalBalance);
  });

  // RECURRING CONTRIBUTIONS

  it("calculates with fixed annual contributions", () => {
    const result = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.07,
      years: 20,
      frequency: "monthly",
      contributions: {
        annualAmount: 3000,
        timing: "START_OF_PERIOD"
      }
    });

    // Total contributions = 10000 + (3000 * 20)
    expect(result.totalContributions).toBe(10000 + 60000);
    expect(result.finalBalance).toBeGreaterThan(result.totalContributions);
  });

  it("applies annual escalation to contributions", () => {
    const result = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.07,
      years: 10,
      frequency: "monthly",
      contributions: {
        annualAmount: 5000,
        // 3% annual raise
        annualEscalation: 0.03,
        timing: "START_OF_PERIOD"
      }
    });

    // Year 1: 5000, Year 2: 5150, Year 3: 5304.5, etc.
    expect(result.totalContributions).toBeGreaterThan(50000);
    expect(result.finalBalance).toBeGreaterThan(result.totalContributions);
  });

  it("handles contribution timing: start vs end of period", () => {
    const startResult = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.05,
      years: 10,
      frequency: "monthly",
      contributions: {
        annualAmount: 2000,
        timing: "START_OF_PERIOD"
      }
    });

    const endResult = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.05,
      years: 10,
      frequency: "monthly",
      contributions: {
        annualAmount: 2000,
        timing: "END_OF_PERIOD"
      }
    });

    // Start of period contributions earn more interest
    expect(startResult.finalBalance).toBeGreaterThan(endResult.finalBalance);
  });

  // TAX MODELING

  it("calculates taxable account with capital gains tax", () => {
    const result = calculateCompoundInterest({
      principal: 100000,
      annualRate: 0.08,
      years: 5,
      frequency: "monthly",
      tax: {
        accountType: "TAXABLE",
        shortTermRate: 0.37,
        longTermRate: 0.15
      }
    });

    expect(result.totalTaxesPaid).toBeGreaterThan(0);
    expect(result.finalBalance).toBeLessThan(
      calculateCompoundInterest({
        principal: 100000,
        annualRate: 0.08,
        years: 5,
        frequency: "monthly"
      }).finalBalance
    );
  });

  it("shows tax-deferred account has no yearly taxes", () => {
    const result = calculateCompoundInterest({
      principal: 100000,
      annualRate: 0.08,
      years: 5,
      frequency: "monthly",
      tax: {
        accountType: "TAX_DEFERRED"
      }
    });

    // Tax-deferred should have no yearly taxes (taxes paid at withdrawal)
    expect(result.totalTaxesPaid).toBe(0);
  });

  it("tax-deferred outperforms taxable for same parameters", () => {
    const taxable = calculateCompoundInterest({
      principal: 100000,
      annualRate: 0.08,
      years: 10,
      frequency: "monthly",
      tax: {
        accountType: "TAXABLE",
        shortTermRate: 0.37,
        longTermRate: 0.15
      }
    });

    const taxDeferred = calculateCompoundInterest({
      principal: 100000,
      annualRate: 0.08,
      years: 10,
      frequency: "monthly",
      tax: {
        accountType: "TAX_DEFERRED"
      }
    });

    expect(taxDeferred.finalBalance).toBeGreaterThan(taxable.finalBalance);
  });

  it("applies different rates for short-term and long-term gains", () => {
    const result = calculateCompoundInterest({
      principal: 50000,
      annualRate: 0.06,
      years: 3,
      frequency: "monthly",
      tax: {
        accountType: "TAXABLE",
        shortTermRate: 0.37,
        longTermRate: 0.15
      }
    });

    // Schedule should show taxes being paid
    expect(result.schedule.length).toBe(3);
    expect(result.totalTaxesPaid).toBeGreaterThan(0);
  });

  // INFLATION ADJUSTMENT

  it("calculates nominal vs real return", () => {
    const result = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.05,
      years: 10,
      frequency: "monthly",
      inflation: 0.02
    });

    expect(result.nominalReturn).toBeGreaterThan(result.realReturn);
  });

  it("shows purchasing power value in today's dollars", () => {
    const result = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.05,
      years: 20,
      frequency: "monthly",
      inflation: 0.03
    });

    // Purchasing power should be less than nominal balance
    expect(result.purchasingPowerValue).toBeLessThan(result.finalBalance);
  });

  it("handles zero inflation", () => {
    const result = calculateCompoundInterest({
      principal: 10000,
      annualRate: 0.05,
      years: 10,
      frequency: "monthly",
      inflation: 0
    });

    expect(result.nominalReturn).toBe(result.realReturn);
    expect(result.purchasingPowerValue).toBe(result.finalBalance);
  });

  it("demonstrates impact of 3% inflation over 30 years", () => {
    const result = calculateCompoundInterest({
      principal: 100000,
      annualRate: 0.07,
      years: 30,
      frequency: "monthly",
      inflation: 0.03
    });

    // With 3% inflation, purchasing power should be significantly less
    // The inflation factor is (1.03)^30 ≈ 2.43, so balance should be ~41% of nominal
    const inflationFactor = Math.pow(1.03, 30);
    const expectedRatio = 1 / inflationFactor; // ~0.41

    expect(result.purchasingPowerValue).toBeLessThan(result.finalBalance);
    expect(result.purchasingPowerValue / result.finalBalance).toBeCloseTo(expectedRatio, 1);
  });

  // SCENARIO COMPARISON

  it("compares taxable vs tax-deferred vs no contributions", () => {
    const comparison = compareScenarios({
      principal: 50000,
      annualRate: 0.08,
      years: 20,
      frequency: "monthly",
      contributions: {
        annualAmount: 5000,
        timing: "START_OF_PERIOD"
      },
      tax: {
        accountType: "TAXABLE",
        shortTermRate: 0.37,
        longTermRate: 0.15
      },
      inflation: 0.02
    });

    expect(comparison.scenarios.length).toBe(3);
    expect(comparison.bestPerformer).toBeDefined();
    expect(comparison.taxSavings).toBeGreaterThan(0);
  });

  it("identifies tax-deferred as best performer", () => {
    const comparison = compareScenarios({
      principal: 100000,
      annualRate: 0.10,
      years: 25,
      frequency: "monthly",
      contributions: {
        annualAmount: 10000
      },
      tax: {
        accountType: "TAXABLE",
        shortTermRate: 0.37,
        longTermRate: 0.20
      }
    });

    // Tax-deferred should be the best performer
    expect(comparison.bestPerformer).toContain("Tax-Deferred");
  });

  // INPUT VALIDATION

  it("throws error for negative principal", () => {
    expect(() =>
      calculateCompoundInterest({
        principal: -1000,
        annualRate: 0.05,
        years: 10
      })
    ).toThrow("Principal must be non-negative.");
  });

  it("throws error for negative interest rate", () => {
    expect(() =>
      calculateCompoundInterest({
        principal: 10000,
        annualRate: -0.05,
        years: 10
      })
    ).toThrow("Annual interest rate cannot be negative.");
  });

  it("throws error for zero or negative years", () => {
    expect(() =>
      calculateCompoundInterest({
        principal: 10000,
        annualRate: 0.05,
        years: 0
      })
    ).toThrow("Years must be greater than zero.");
  });

  it("throws error for invalid inflation rate", () => {
    expect(() =>
      calculateCompoundInterest({
        principal: 10000,
        annualRate: 0.05,
        years: 10,
        inflation: 1.5
      })
    ).toThrow("Inflation rate must be less than 100%.");
  });

  it("throws error for negative contribution amount", () => {
    expect(() =>
      calculateCompoundInterest({
        principal: 10000,
        annualRate: 0.05,
        years: 10,
        contributions: {
          annualAmount: -500
        }
      })
    ).toThrow("Contribution amount cannot be negative.");
  });

  it("throws error for invalid escalation rate", () => {
    expect(() =>
      calculateCompoundInterest({
        principal: 10000,
        annualRate: 0.05,
        years: 10,
        contributions: {
          annualAmount: 1000,
          annualEscalation: 1.5
        }
      })
    ).toThrow("Annual escalation must be between 0 and 1 (exclusive of 1).");
  });

  it("throws error for invalid tax rates", () => {
    expect(() =>
      calculateCompoundInterest({
        principal: 10000,
        annualRate: 0.05,
        years: 10,
        tax: {
          accountType: "TAXABLE",
          shortTermRate: 1.5
        }
      })
    ).toThrow("Short-term tax rate must be between 0 and 1.");
  });

  // REAL-WORLD SCENARIOS

  it("models 401k growth: $5k annual contributions, 7% return, 30 years", () => {
    const result = calculateCompoundInterest({
      principal: 0,
      annualRate: 0.07,
      years: 30,
      frequency: "monthly",
      contributions: {
        annualAmount: 5000,
        annualEscalation: 0.02,
        timing: "START_OF_PERIOD"
      },
      tax: {
        accountType: "TAX_DEFERRED"
      }
    });

    // Should accumulate to $500k+
    expect(result.finalBalance).toBeGreaterThan(500000);
    expect(result.totalTaxesPaid).toBe(0);
  });

  it("models taxable brokerage: starting $100k, 8% return, 2% contributions escalation", () => {
    const result = calculateCompoundInterest({
      principal: 100000,
      annualRate: 0.08,
      years: 20,
      frequency: "monthly",
      contributions: {
        annualAmount: 6000,
        annualEscalation: 0.03,
        timing: "END_OF_PERIOD"
      },
      tax: {
        accountType: "TAXABLE",
        shortTermRate: 0.37,
        longTermRate: 0.15
      },
      inflation: 0.025
    });

    expect(result.finalBalance).toBeGreaterThan(400000);
    expect(result.totalTaxesPaid).toBeGreaterThan(0);
    expect(result.purchasingPowerValue).toBeLessThan(result.finalBalance);
  });

  it("shows impact of inflation: $1M purchasing power after 30 years", () => {
    const result = calculateCompoundInterest({
      principal: 1000000,
      annualRate: 0.04,
      years: 30,
      frequency: "annual",
      inflation: 0.03
    });

    // $1M should be worth much less in 30 years with 3% inflation
    const inflationErosion = (result.finalBalance - result.purchasingPowerValue) / result.finalBalance;
    expect(inflationErosion).toBeGreaterThan(0.5);  // Over 50% erosion
  });

  // PRECISION & EDGE CASES

  it("handles very small principal values", () => {
    const result = calculateCompoundInterest({
      principal: 0.01,
      annualRate: 0.05,
      years: 10,
      frequency: "monthly"
    });

    expect(result.finalBalance).toBeGreaterThan(0);
  });

  it("handles high interest rates without overflow", () => {
    const result = calculateCompoundInterest({
      principal: 10000,
      // 25% annual
      annualRate: 0.25, 
      years: 5,
      frequency: "monthly"
    });

    // 25% monthly compounding for 5 years:
    expect(result.finalBalance).toBeGreaterThan(30000);
    expect(result.finalBalance).toBeLessThan(40000);
  });

  it("variable impact analysis: different contribution levels", () => {
    const analysis = analyzeVariableImpact(
      {
        principal: 50000,
        annualRate: 0.07,
        years: 20,
        frequency: "monthly",
        contributions: { annualAmount: 5000 },
        tax: { accountType: "TAX_DEFERRED" }
      },
      "contributions",
      [2500, 5000, 7500]
    );

    // More contributions should yield higher balance
    const balances = Object.values(analysis).map(v => v[0]);
    expect(balances[0]).toBeLessThan(balances[1]);
    expect(balances[1]).toBeLessThan(balances[2]);
  });
});
