import { Decimal } from "../core/decimal";
import { applyRounding } from "../core/rounding";
import { validateCompoundInterestInput } from "./validation";

import {
  CompoundInterestInput,
  CompoundInterestResult,
  CompoundInterestScheduleItem
} from "./types";

// ✅ Get periods per year
function getPeriodsPerYear(freq: string): number {
  const freqMap: Record<string, number> = {
    "annual": 1,
    "semi-annual": 2,
    "quarterly": 4,
    "monthly": 12,
    "daily": 365
  };
  return freqMap[freq] || 12;
}

// ✅ Core compound interest calculation with contributions
export function calculateCompoundInterest(
  input: CompoundInterestInput
): CompoundInterestResult {

  validateCompoundInterestInput(input);

  const {
    principal,
    annualRate,
    years,
    frequency = "monthly",
    contributions,
    tax,
    inflation = 0,
    roundingPolicy = {},
    decimalPlaces = 2
  } = input;

  const P = new Decimal(principal);
  const r = new Decimal(annualRate);
  const n = new Decimal(getPeriodsPerYear(frequency));
  const infl = new Decimal(inflation);

  let balance = P;
  let costBasis = P;  // Principal + contributions
  let cumulativeContributions = P;
  let cumulativeTaxes = new Decimal(0);
  let totalInterestEarned = new Decimal(0);

  const schedule: CompoundInterestScheduleItem[] = [];

  // ✅ Tax tracking: gains by year (year -> amount)
  const gainsHistory: Map<number, Decimal> = new Map();

  for (let year = 1; year <= years; year++) {

    let yearlyContribution = new Decimal(0);

    // ✅ Handle contributions with optional escalation
    if (contributions) {
      let baseAmount = new Decimal(contributions.annualAmount);
      const escalation = contributions.annualEscalation ?? 0;

      if (escalation > 0) {
        // Escalate: year 1 = base, year 2 = base * (1 + esc), etc.
        baseAmount = baseAmount.mul(
          new Decimal(1 + escalation).pow(year - 1)
        );
      }

      yearlyContribution = baseAmount;

      // Add contribution at start of period (before interest accrues)
      if (contributions.timing !== "END_OF_PERIOD") {
        balance = balance.plus(yearlyContribution);
        costBasis = costBasis.plus(yearlyContribution);
        cumulativeContributions = cumulativeContributions.plus(yearlyContribution);
      }
    }

    // ✅ Calculate interest for the year
    // FV = PV(1 + r/n)^n for one year
    const periodicRate = r.div(n);
    const factor = periodicRate.plus(1).pow(n.toNumber());
    const yearEndBalance = balance.mul(factor);
    const yearlyInterest = yearEndBalance.minus(balance);

    balance = yearEndBalance;
    totalInterestEarned = totalInterestEarned.plus(yearlyInterest);

    // ✅ Track gains for tax calculation
    gainsHistory.set(year, yearlyInterest);

    // ✅ Add contribution at end of period (after interest)
    if (contributions?.timing === "END_OF_PERIOD") {
      balance = balance.plus(yearlyContribution);
      costBasis = costBasis.plus(yearlyContribution);
      cumulativeContributions = cumulativeContributions.plus(yearlyContribution);
    }

    // ✅ Calculate taxes
    let yearlyTaxes = new Decimal(0);
    let shortTermGains = new Decimal(0);
    let longTermGains = new Decimal(0);

    if (tax && tax.accountType === "TAXABLE") {
      // Short-term: gains from current year
      shortTermGains = yearlyInterest;

      // Long-term: gains from prior years that have been held 1+ year
      for (let priorYear = 1; priorYear < year; priorYear++) {
        const priorGains = gainsHistory.get(priorYear) ?? new Decimal(0);
        longTermGains = longTermGains.plus(priorGains);
      }

      // Clear prior years from short-term (now all long-term)
      gainsHistory.clear();
      gainsHistory.set(year, yearlyInterest);

      const stRate = new Decimal(tax.shortTermRate ?? 0.37);
      const ltRate = new Decimal(tax.longTermRate ?? 0.15);

      const stTax = shortTermGains.mul(stRate);
      const ltTax = longTermGains.mul(ltRate);

      yearlyTaxes = stTax.plus(ltTax);
      balance = balance.minus(yearlyTaxes);
      cumulativeTaxes = cumulativeTaxes.plus(yearlyTaxes);
    }

    // ✅ Calculate real balance (inflation-adjusted)
    const inflationFactor = infl.plus(1).pow(year);
    const realBalance = balance.div(inflationFactor);

    // ✅ Format output
    let outputInterest = yearlyInterest;
    let outputTaxes = yearlyTaxes;
    let outputBalance = balance;
    let outputRealBalance = realBalance;
    let outputContribution = yearlyContribution;

    if (true) {  // Always apply rounding for output
      outputInterest = applyRounding(
        yearlyInterest,
        decimalPlaces,
        roundingPolicy.interest ?? "HALF_UP"
      );

      outputTaxes = applyRounding(
        yearlyTaxes,
        decimalPlaces,
        roundingPolicy.tax ?? "HALF_UP"
      );

      outputBalance = applyRounding(
        balance,
        decimalPlaces,
        roundingPolicy.balance ?? "HALF_UP"
      );

      outputRealBalance = applyRounding(
        realBalance,
        decimalPlaces,
        roundingPolicy.balance ?? "HALF_UP"
      );

      outputContribution = applyRounding(
        yearlyContribution,
        decimalPlaces,
        roundingPolicy.balance ?? "HALF_UP"
      );
    }

    schedule.push({
      year,
      contribution: outputContribution.toNumber(),
      interestEarned: outputInterest.toNumber(),
      shortTermGains: shortTermGains.mul(10000).div(10000).toNumber(),  // Show gains, not taxes
      longTermGains: longTermGains.mul(10000).div(10000).toNumber(),
      taxesPaid: outputTaxes.toNumber(),
      balance: outputBalance.toNumber(),
      cumulativeContributions: cumulativeContributions.toNumber(),
      cumulativeTaxes: cumulativeTaxes.toNumber(),
      nominalBalance: outputBalance.toNumber(),
      realBalance: outputRealBalance.toNumber()
    });
  }

  // ✅ Calculate final metrics
  const finalBalance = balance;
  const netGains = finalBalance.minus(costBasis);
  const nominalReturn = finalBalance.minus(cumulativeContributions).div(cumulativeContributions).mul(100);
  
  // Real return: account for inflation
  const inflationAdjustment = infl.plus(1).pow(years);
  const realBalance = finalBalance.div(inflationAdjustment);
  const realReturn = realBalance.minus(cumulativeContributions).div(cumulativeContributions).mul(100);

  return {
    finalBalance: applyRounding(
      finalBalance,
      decimalPlaces,
      roundingPolicy.balance ?? "HALF_UP"
    ).toNumber(),
    totalContributions: applyRounding(
      cumulativeContributions,
      decimalPlaces,
      roundingPolicy.balance ?? "HALF_UP"
    ).toNumber(),
    totalInterestEarned: applyRounding(
      totalInterestEarned,
      decimalPlaces,
      roundingPolicy.interest ?? "HALF_UP"
    ).toNumber(),
    totalTaxesPaid: applyRounding(
      cumulativeTaxes,
      decimalPlaces,
      roundingPolicy.tax ?? "HALF_UP"
    ).toNumber(),
    netGains: applyRounding(
      netGains,
      decimalPlaces,
      roundingPolicy.balance ?? "HALF_UP"
    ).toNumber(),
    // Total return: (gains / total cost basis) * 100
    // Total cost basis = principal + all contributions
    nominalReturn: nominalReturn.toNumber(),
    // Real return accounts for inflation
    realReturn: realReturn.toNumber(),
    purchasingPowerValue: applyRounding(
      realBalance,
      decimalPlaces,
      roundingPolicy.balance ?? "HALF_UP"
    ).toNumber(),
    schedule
  };
}
