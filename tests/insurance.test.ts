import { describe, it, expect } from "vitest";
import { calculateInsurancePremium, compareInsuranceOptions } from "../src/insurance";

describe("Insurance Premium Model", () => {

  // ========================================
  // BASIC PREMIUM CALCULATIONS
  // ========================================

  it("calculates term life premium for 35-year-old in good health", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 35,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    expect(result.annualPremium).toBeGreaterThan(0);
    expect(result.annualPremium).toBeLessThan(1000);  // Reasonable for 35, good health
    expect(result.ageBand).toBe("26_35");
  });

  it("calculates term life premium for 55-year-old", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 55,
      faceAmount: 500000,
      termYears: 10,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    expect(result.ageBand).toBe("46_55");
    expect(result.annualPremium).toBeGreaterThan(0);
  });

  it("calculates whole life premium", () => {
    const result = calculateInsurancePremium({
      insuranceType: "WHOLE_LIFE",
      age: 40,
      faceAmount: 250000,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "LOW",
        medicalHistory: "NONE"
      }
    });

    expect(result.insuranceType).toBe("WHOLE_LIFE");
    expect(result.annualPremium).toBeGreaterThan(600);  // Whole life is more expensive than term
    expect(result.schedule.length).toBeGreaterThan(20);
  });

  // ========================================
  // RISK MULTIPLIERS
  // ========================================

  it("applies health status multiplier", () => {
    const excellent = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 40,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "EXCELLENT",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    const poor = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 40,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "POOR",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    // Poor health should have higher premium
    expect(poor.annualPremium).toBeGreaterThan(excellent.annualPremium);
    expect(poor.riskMultiplier).toBeGreaterThan(excellent.riskMultiplier);
  });

  it("applies occupation risk multiplier", () => {
    const low = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 40,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "LOW",
        medicalHistory: "NONE"
      }
    });

    const high = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 40,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "HIGH",
        medicalHistory: "NONE"
      }
    });

    expect(high.annualPremium).toBeGreaterThan(low.annualPremium);
  });

  it("applies medical history multiplier", () => {
    const none = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 45,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    const chronic = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 45,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "CHRONIC_DISEASE"
      }
    });

    expect(chronic.annualPremium).toBeGreaterThan(none.annualPremium);
  });

  it("applies smoker multiplier", () => {
    const nonSmoker = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 35,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE",
        smoker: false
      }
    });

    const smoker = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 35,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE",
        smoker: true
      }
    });

    expect(smoker.annualPremium).toBeGreaterThan(nonSmoker.annualPremium);
    expect(smoker.riskMultiplier).toBeGreaterThan(nonSmoker.riskMultiplier);
  });

  it("adds rider cost for accidental death benefit and waiver of premium", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 35,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      },
      riders: {
        accidentalDeathBenefitRate: 0.5,
        waiverOfPremium: true
      }
    });

    expect(result.riderPremium).toBeGreaterThan(0);
    expect(result.totalRiderCost).toBeGreaterThan(result.riderPremium!);
  });

  // ========================================
  // COVERAGE DECREASING
  // ========================================

  it("decreases coverage annually when configured", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 35,
      faceAmount: 500000,
      termYears: 20,
      coverageDecreaseRate: 0.02,  // 2% per year
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    expect(result.originalCoverage).toBe(500000);
    expect(result.finalCoverage).toBeLessThan(500000);
    
    // Year 1 coverage should be slightly less than original
    expect(result.schedule[0].currentCoverage).toBeLessThan(500000);
  });

  it("maintains coverage when decrease rate is zero", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 35,
      faceAmount: 500000,
      termYears: 20,
      coverageDecreaseRate: 0,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    // Coverage should remain constant
    result.schedule.forEach(item => {
      expect(item.currentCoverage).toBeCloseTo(500000, 0);
    });
  });

  // ========================================
  // INFLATION ADJUSTMENT
  // ========================================

  it("increases coverage with inflation adjustment", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 35,
      faceAmount: 500000,
      termYears: 20,
      inflationAdjustment: 0.03,  // 3% annual
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    expect(result.finalCoverage).toBeGreaterThan(result.originalCoverage);
  });

  // ========================================
  // AGE BANDS
  // ========================================

  it("reflects correct age band for each decade", () => {
    const ages = [20, 30, 40, 50, 60, 70];
    const expectedBands = ["18_25", "26_35", "36_45", "46_55", "56_65", "65_PLUS"];

    ages.forEach((age, index) => {
      const result = calculateInsurancePremium({
        insuranceType: "TERM_LIFE",
        age,
        faceAmount: 500000,
        termYears: 20,
        riskProfile: {
          healthStatus: "GOOD",
          occupationRisk: "MEDIUM",
          medicalHistory: "NONE"
        }
      });

      expect(result.ageBand).toBe(expectedBands[index]);
    });
  });

  // ========================================
  // SCHEDULE GENERATION
  // ========================================

  it("generates correct schedule length for term life", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 35,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    expect(result.schedule.length).toBe(20);
  });

  it("increments age correctly in schedule", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 40,
      faceAmount: 500000,
      termYears: 10,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    expect(result.schedule[0].age).toBe(40);
    expect(result.schedule[1].age).toBe(41);
    expect(result.schedule[9].age).toBe(49);
  });

  // ========================================
  // WHOLE LIFE CASH VALUE
  // ========================================

  it("accumulates cash value for whole life", () => {
    const result = calculateInsurancePremium({
      insuranceType: "WHOLE_LIFE",
      age: 35,
      faceAmount: 500000,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    // Cash value should exist for whole life
    expect(result.projectedCashValue).toBeDefined();
    expect(result.projectedCashValue).toBeGreaterThan(0);

    // Schedule should show cash value growth
    const scheduleWithValue = result.schedule.filter(item => item.cashValue !== undefined);
    expect(scheduleWithValue.length).toBeGreaterThan(0);
  });

  // ========================================
  // TERM VS WHOLE LIFE COMPARISON
  // ========================================

  it("shows term life is cheaper than whole life annually", () => {
    const comparison = compareInsuranceOptions({
      insuranceType: "TERM_LIFE",
      age: 40,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    expect(comparison.termLife.annualPremium).toBeLessThan(comparison.wholeLife.annualPremium);
    expect(comparison.annualPremiumDifference).toBeGreaterThan(0);
  });

  it("provides recommendation based on cost difference", () => {
    const comparison = compareInsuranceOptions({
      insuranceType: "TERM_LIFE",
      age: 30,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    expect(comparison.recommendation).toBeDefined();
    expect(comparison.recommendation.length).toBeGreaterThan(0);
  });

  // ========================================
  // INPUT VALIDATION
  // ========================================

  it("throws error for age out of range", () => {
    expect(() =>
      calculateInsurancePremium({
        insuranceType: "TERM_LIFE",
        age: 17,
        faceAmount: 500000,
        termYears: 20,
        riskProfile: {
          healthStatus: "GOOD",
          occupationRisk: "MEDIUM",
          medicalHistory: "NONE"
        }
      })
    ).toThrow("Age must be between 18 and 100.");
  });

  it("throws error for invalid face amount", () => {
    expect(() =>
      calculateInsurancePremium({
        insuranceType: "TERM_LIFE",
        age: 35,
        faceAmount: 0,
        termYears: 20,
        riskProfile: {
          healthStatus: "GOOD",
          occupationRisk: "MEDIUM",
          medicalHistory: "NONE"
        }
      })
    ).toThrow("Face amount (coverage) must be greater than zero.");
  });

  it("throws error for missing termYears on term life", () => {
    expect(() =>
      calculateInsurancePremium({
        insuranceType: "TERM_LIFE",
        age: 35,
        faceAmount: 500000,
        riskProfile: {
          healthStatus: "GOOD",
          occupationRisk: "MEDIUM",
          medicalHistory: "NONE"
        }
      })
    ).toThrow("termYears is required for TERM_LIFE insurance.");
  });

  it("throws error for excessive face amount", () => {
    expect(() =>
      calculateInsurancePremium({
        insuranceType: "TERM_LIFE",
        age: 35,
        faceAmount: 50000000,
        termYears: 20,
        riskProfile: {
          healthStatus: "GOOD",
          occupationRisk: "MEDIUM",
          medicalHistory: "NONE"
        }
      })
    ).toThrow("Face amount cannot exceed $10,000,000.");
  });

  it("throws error for invalid coverage decrease rate", () => {
    expect(() =>
      calculateInsurancePremium({
        insuranceType: "TERM_LIFE",
        age: 35,
        faceAmount: 500000,
        termYears: 20,
        coverageDecreaseRate: 1.5,
        riskProfile: {
          healthStatus: "GOOD",
          occupationRisk: "MEDIUM",
          medicalHistory: "NONE"
        }
      })
    ).toThrow("Coverage decrease rate must be between 0 and 1 (exclusive of 1).");
  });

  // ========================================
  // REAL-WORLD SCENARIOS
  // ========================================

  it("models typical 30-year-old seeking $500k coverage", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 30,
      faceAmount: 500000,
      termYears: 30,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    expect(result.annualPremium).toBeGreaterThan(100);
    expect(result.annualPremium).toBeLessThan(500);
    expect(result.totalPremiumsOverTerm).toBeGreaterThan(3000);
  });

  it("models smoker with chronic disease", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 50,
      faceAmount: 300000,
      termYears: 15,
      riskProfile: {
        healthStatus: "FAIR",
        occupationRisk: "HIGH",
        medicalHistory: "CHRONIC_DISEASE",
        smoker: true
      }
    });

    expect(result.riskMultiplier).toBeGreaterThan(2.0);
    expect(result.annualPremium).toBeGreaterThan(500);  // High risk should have significant premium
  });

  it("models young excellent health", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 25,
      faceAmount: 1000000,
      termYears: 30,
      riskProfile: {
        healthStatus: "EXCELLENT",
        occupationRisk: "LOW",
        medicalHistory: "NONE",
        smoker: false
      }
    });

    expect(result.riskMultiplier).toBeLessThan(1.0);  // Discount
    expect(result.annualPremium).toBeLessThan(500);
  });

  it("calculates cost per $1000 coverage correctly", () => {
    const result = calculateInsurancePremium({
      insuranceType: "TERM_LIFE",
      age: 35,
      faceAmount: 500000,
      termYears: 20,
      riskProfile: {
        healthStatus: "GOOD",
        occupationRisk: "MEDIUM",
        medicalHistory: "NONE"
      }
    });

    // Each schedule item should show cost per 1000
    result.schedule.forEach(item => {
      expect(item.costPerThousandCoverage).toBeGreaterThan(0);
    });
  });
});
