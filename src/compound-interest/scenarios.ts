import { Decimal } from "../core/decimal";
import { calculateCompoundInterest } from "./engine";
import { CompoundInterestInput, ScenarioComparison, ScenarioItem } from "./types";

// Compare three scenarios: taxable, tax-deferred, no contributions
export function compareScenarios(
  baseInput: CompoundInterestInput
): ScenarioComparison {

  // Scenario 1: Taxable account with contributions
  const taxableResult = calculateCompoundInterest({
    ...baseInput,
    tax: {
      accountType: "TAXABLE",
      shortTermRate: baseInput.tax?.shortTermRate ?? 0.37,
      longTermRate: baseInput.tax?.longTermRate ?? 0.15
    }
  });

  // Scenario 2: Tax-deferred account with contributions (401k/IRA)
  const taxDeferredResult = calculateCompoundInterest({
    ...baseInput,
    tax: {
      accountType: "TAX_DEFERRED"
    }
  });

  // Scenario 3: No contributions, only principal growth
  const noContributionsResult = calculateCompoundInterest({
    ...baseInput,
    contributions: undefined,
    tax: {
      accountType: "TAXABLE",
      shortTermRate: baseInput.tax?.shortTermRate ?? 0.37,
      longTermRate: baseInput.tax?.longTermRate ?? 0.15
    }
  });

  const scenarios: ScenarioItem[] = [
    {
      scenario: "Taxable (with contributions)",
      finalBalance: taxableResult.finalBalance,
      totalContributions: taxableResult.totalContributions,
      totalTaxesPaid: taxableResult.totalTaxesPaid,
      netGains: taxableResult.netGains,
      purchasingPowerValue: taxableResult.purchasingPowerValue
    },
    {
      scenario: "Tax-Deferred 401k/IRA (with contributions)",
      finalBalance: taxDeferredResult.finalBalance,
      totalContributions: taxDeferredResult.totalContributions,
      totalTaxesPaid: taxDeferredResult.totalTaxesPaid,
      netGains: taxDeferredResult.netGains,
      purchasingPowerValue: taxDeferredResult.purchasingPowerValue
    },
    {
      scenario: "Taxable (principal only, no contributions)",
      finalBalance: noContributionsResult.finalBalance,
      totalContributions: noContributionsResult.totalContributions,
      totalTaxesPaid: noContributionsResult.totalTaxesPaid,
      netGains: noContributionsResult.netGains,
      purchasingPowerValue: noContributionsResult.purchasingPowerValue
    }
  ];

  // Find best performer by final balance
  let bestPerformer = scenarios[0].scenario;
  let maxBalance = scenarios[0].finalBalance;

  scenarios.forEach(s => {
    if (s.finalBalance > maxBalance) {
      maxBalance = s.finalBalance;
      bestPerformer = s.scenario;
    }
  });

  // Calculate tax savings (tax-deferred vs taxable)
  const taxSavings = taxableResult.totalTaxesPaid - taxDeferredResult.totalTaxesPaid;

  // Calculate inflation impact
  const nominalPower = new Decimal(taxDeferredResult.finalBalance);
  const realPower = new Decimal(taxDeferredResult.purchasingPowerValue);
  const inflationImpact = nominalPower.minus(realPower).toNumber();

  return {
    scenarios,
    bestPerformer,
    taxSavings,
    inflationImpact
  };
}

// Impact analysis: how much does one variable change the outcome?
export function analyzeVariableImpact(
  baseInput: CompoundInterestInput,
  variable: "rate" | "contributions" | "inflation",
  scenarios: number[]
): Record<string, number[]> {

  const results: Record<string, number[]> = {};

  scenarios.forEach(scenario => {
    let input = { ...baseInput };

    if (variable === "rate") {
      input.annualRate = scenario;
    } else if (variable === "contributions") {
      input.contributions = {
        ...baseInput.contributions,
        annualAmount: scenario
      };
    } else if (variable === "inflation") {
      input.inflation = scenario;
    }

    const result = calculateCompoundInterest(input);
    results[scenario.toString()] = [result.finalBalance, result.purchasingPowerValue];
  });

  return results;
}
