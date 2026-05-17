import { HealthStatus, OccupationRisk, MedicalHistory, AgeBand, RiskProfile } from "./types";

// Health status multipliers
export function getHealthMultiplier(health: HealthStatus): number {
  const multipliers: Record<HealthStatus, number> = {
    "EXCELLENT": 0.75,   // 25% discount
    "GOOD": 1.0,         // Standard
    "FAIR": 1.35,        // 35% premium
    "POOR": 1.85         // 85% premium
  };
  return multipliers[health];
}

// Occupation risk multipliers
export function getOccupationMultiplier(risk: OccupationRisk): number {
  const multipliers: Record<OccupationRisk, number> = {
    "LOW": 0.90,         // 10% discount (safe jobs)
    "MEDIUM": 1.0,       // Standard
    "HIGH": 1.60         // 60% premium (dangerous jobs)
  };
  return multipliers[risk];
}

// Medical history multipliers
export function getMedicalMultiplier(history: MedicalHistory): number {
  const multipliers: Record<MedicalHistory, number> = {
    "NONE": 1.0,                 // Standard
    "MINOR_CONDITIONS": 1.15,    // Managed conditions
    "CHRONIC_DISEASE": 1.45,     // Diabetes, hypertension, etc
    "SERIOUS_ILLNESS": 1.95      // Cancer history, heart disease, etc
  };
  return multipliers[history];
}

// Smoker status multiplier
export function getSmokerMultiplier(smoker: boolean): number {
  return smoker ? 1.5 : 1.0;  // 50% premium for smokers
}

// Base premium per $1000 coverage by age band
export function getBasePremiumPerThousand(ageBand: AgeBand, insuranceType: string): number {
  const termPremiums: Record<AgeBand, number> = {
    "18_25": 0.30,
    "26_35": 0.35,
    "36_45": 0.45,
    "46_55": 0.75,
    "56_65": 1.50,
    "65_PLUS": 3.50
  };

  const wholePremiums: Record<AgeBand, number> = {
    "18_25": 2.50,
    "26_35": 3.00,
    "36_45": 4.00,
    "46_55": 6.50,
    "56_65": 10.00,
    "65_PLUS": 15.00
  };

  const rates = insuranceType === "WHOLE_LIFE" ? wholePremiums : termPremiums;
  return rates[ageBand];
}

// Determine age band from current age
export function getAgeBand(age: number): AgeBand {
  if (age < 26) return "18_25";
  if (age < 36) return "26_35";
  if (age < 46) return "36_45";
  if (age < 56) return "46_55";
  if (age < 66) return "56_65";
  return "65_PLUS";
}

//Calculate overall risk multiplier
export function calculateRiskMultiplier(riskProfile: RiskProfile): number {
  const healthMult = getHealthMultiplier(riskProfile.healthStatus);
  const occMult = getOccupationMultiplier(riskProfile.occupationRisk);
  const medicalMult = getMedicalMultiplier(riskProfile.medicalHistory);
  const smokerMult = getSmokerMultiplier(riskProfile.smoker ?? false);

  // Multiply all factors, but cap at max 3.0x to prevent extreme rates
  const multiplier = healthMult * occMult * medicalMult * smokerMult;
  return Math.min(multiplier, 3.0);
}

// Whole Life cash value accumulation (simplified)
// Grows at ~2.5% annually, represents accumulated cash value
export function calculateCashValue(
  annualPremium: number,
  yearsInForce: number
): number {
  if (yearsInForce < 2) return 0;  // No cash value in first 2 years
  
  // Simplified: 60% of premiums paid after 2 years, grows at 2.5%
  const baseCashValue = annualPremium * yearsInForce * 0.60;
  const growthRate = 1.025;
  
  return baseCashValue * Math.pow(growthRate, yearsInForce - 2);
}
