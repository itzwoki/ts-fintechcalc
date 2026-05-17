import { Decimal } from "../core/decimal";
import { applyRounding } from "../core/rounding";
import { validateInsuranceInput } from "./validation";
import {
  calculateRiskMultiplier,
  getAgeBand,
  getBasePremiumPerThousand,
  calculateCashValue
} from "./riskMultipliers";

import {
  InsuranceInput,
  InsuranceResult,
  InsuranceScheduleItem,
  InsuranceComparison
} from "./types";

export function calculateInsurancePremium(
  input: InsuranceInput
): InsuranceResult {
  validateInsuranceInput(input);

  const {
    insuranceType,
    age,
    faceAmount,
    // Default term for whole life
    termYears = 20,
    riskProfile,
    coverageDecreaseRate = 0,
    inflationAdjustment = 0,
    riders = {},
    roundingPolicy = {},
    decimalPlaces = 2
  } = input;

  const riskMultiplier = calculateRiskMultiplier(riskProfile);
  const ageBand = getAgeBand(age);
  const basePremiumPerThousand = getBasePremiumPerThousand(ageBand, insuranceType);

  const faceAmountInThousands = new Decimal(faceAmount).div(1000);
  const basePremium = new Decimal(basePremiumPerThousand);
  const riskMult = new Decimal(riskMultiplier);

  const baseAnnualPremium = faceAmountInThousands
    .mul(basePremium)
    .mul(riskMult);

  const riderPremium = new Decimal(riders.accidentalDeathBenefitRate ?? 0)
    .mul(faceAmountInThousands);

  const waiverPremium = riders.waiverOfPremium ? baseAnnualPremium.mul(0.1) : new Decimal(0);
  const annualPremium = baseAnnualPremium.plus(riderPremium).plus(waiverPremium);

  const schedule: InsuranceScheduleItem[] = [];
  let cumulativePremiums = new Decimal(0);
  let currentCoverage = new Decimal(faceAmount);
  let currentAge = age;

  const policyYears = insuranceType === "TERM_LIFE" ? termYears : 50;

  for (let year = 1; year <= policyYears; year++) {
    let currentYearPremium = annualPremium;

    if (currentAge !== age && insuranceType === "TERM_LIFE") {
      const newAgeBand = getAgeBand(currentAge);
      const newBase = getBasePremiumPerThousand(newAgeBand, insuranceType);
      currentYearPremium = faceAmountInThousands
        .mul(new Decimal(newBase))
        .mul(riskMult);
    }

    cumulativePremiums = cumulativePremiums.plus(currentYearPremium);

    if (coverageDecreaseRate > 0) {
      const decreaseRate = new Decimal(coverageDecreaseRate);
      currentCoverage = currentCoverage.mul(
        new Decimal(1).minus(decreaseRate)
      );
    }

    if (inflationAdjustment > 0) {
      const inflRate = new Decimal(inflationAdjustment);
      currentCoverage = currentCoverage.mul(
        new Decimal(1).plus(inflRate)
      );
    }

    const costPerThousand = currentCoverage.gt(0)
      ? currentYearPremium.mul(1000).div(currentCoverage)
      : new Decimal(0);

    let cashValue: Decimal | undefined;
    if (insuranceType === "WHOLE_LIFE" && year >= 2) {
      cashValue = new Decimal(
        calculateCashValue(currentYearPremium.toNumber(), year)
      );
    }

    let outputPremium = applyRounding(
      currentYearPremium,
      decimalPlaces,
      roundingPolicy.premium ?? "HALF_UP"
    );

    let outputCoverage = applyRounding(
      currentCoverage,
      decimalPlaces,
      roundingPolicy.coverage ?? "HALF_UP"
    );

    schedule.push({
      year,
      age: currentAge,
      annualPremium: outputPremium.toNumber(),
      currentCoverage: outputCoverage.toNumber(),
      riskMultiplier: riskMultiplier,
      cumulativePremiumsPaid: applyRounding(
        cumulativePremiums,
        decimalPlaces,
        roundingPolicy.premium ?? "HALF_UP"
      ).toNumber(),
      costPerThousandCoverage: applyRounding(
        costPerThousand,
        decimalPlaces,
        roundingPolicy.premium ?? "HALF_UP"
      ).toNumber(),
      riderPremium: applyRounding(
        riderPremium,
        decimalPlaces,
        roundingPolicy.premium ?? "HALF_UP"
      ).toNumber(),
      cashValue: cashValue ? applyRounding(
        cashValue,
        decimalPlaces,
        roundingPolicy.coverage ?? "HALF_UP"
      ).toNumber() : undefined
    });

    currentAge++;
  }

  const totalPremiums = applyRounding(
    cumulativePremiums,
    decimalPlaces,
    roundingPolicy.premium ?? "HALF_UP"
  );

  const avgCostPerThousand = totalPremiums
    .mul(1000)
    .div(new Decimal(faceAmount))
    .div(new Decimal(policyYears));

  const finalCoverage = applyRounding(
    currentCoverage,
    decimalPlaces,
    roundingPolicy.coverage ?? "HALF_UP"
  );

  let projectedCashValue: Decimal | undefined;
  if (insuranceType === "WHOLE_LIFE") {
    projectedCashValue = new Decimal(
      calculateCashValue(annualPremium.toNumber(), policyYears)
    );
  }

  return {
    annualPremium: applyRounding(
      annualPremium,
      decimalPlaces,
      roundingPolicy.premium ?? "HALF_UP"
    ).toNumber(),
    totalPremiumsOverTerm: totalPremiums.toNumber(),
    averageCostPerThousand: applyRounding(
      avgCostPerThousand,
      decimalPlaces,
      roundingPolicy.premium ?? "HALF_UP"
    ).toNumber(),
    riderPremium: applyRounding(
      riderPremium.plus(waiverPremium),
      decimalPlaces,
      roundingPolicy.premium ?? "HALF_UP"
    ).toNumber(),
    totalRiderCost: applyRounding(
      riderPremium.plus(waiverPremium).mul(new Decimal(policyYears)),
      decimalPlaces,
      roundingPolicy.premium ?? "HALF_UP"
    ).toNumber(),
    finalCoverage: finalCoverage.toNumber(),
    originalCoverage: faceAmount,
    riskMultiplier: riskMultiplier,
    insuranceType: insuranceType,
    ageBand: ageBand,
    schedule,
    projectedCashValue: projectedCashValue?.toNumber()
  };
}

export function compareInsuranceOptions(
  input: InsuranceInput
): InsuranceComparison {
  const termResult = calculateInsurancePremium({
    ...input,
    insuranceType: "TERM_LIFE",
    termYears: input.termYears ?? 20
  });

  const wholeResult = calculateInsurancePremium({
    ...input,
    insuranceType: "WHOLE_LIFE"
  });

  const annualDifference = new Decimal(wholeResult.annualPremium)
    .minus(termResult.annualPremium);

  const totalDifference = new Decimal(wholeResult.totalPremiumsOverTerm)
    .minus(termResult.totalPremiumsOverTerm);

  let recommendation = "";
  if (annualDifference.lt(300)) {
    recommendation = "Whole Life may be worth considering for lifetime protection and cash value buildup.";
  } else if (annualDifference.lt(500)) {
    recommendation = "Term Life offers better value if you only need coverage for the next 20 years.";
  } else {
    recommendation = "Term Life is significantly more affordable. Consider for protection during working years only.";
  }

  return {
    termLife: termResult,
    wholeLife: wholeResult,
    annualPremiumDifference: annualDifference.toNumber(),
    totalCostDifference: totalDifference.toNumber(),
    recommendation
  };
}
