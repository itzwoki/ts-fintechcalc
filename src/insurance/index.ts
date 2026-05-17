export { calculateInsurancePremium, compareInsuranceOptions } from "./engine";
export {
  getHealthMultiplier,
  getOccupationMultiplier,
  getMedicalMultiplier,
  getSmokerMultiplier,
  getBasePremiumPerThousand,
  getAgeBand,
  calculateRiskMultiplier
} from "./riskMultipliers";
export {
  type InsuranceType,
  type HealthStatus,
  type OccupationRisk,
  type MedicalHistory,
  type AgeBand,
  type RiskProfile,
  type InsuranceInput,
  type InsuranceScheduleItem,
  type InsuranceResult,
  type InsuranceComparison
} from "./types";
export { validateInsuranceInput } from "./validation";
