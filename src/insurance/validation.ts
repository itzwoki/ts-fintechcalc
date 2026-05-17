import { InsuranceInput } from "./types";

export function validateInsuranceInput(input: InsuranceInput): void {

  if (input.age < 18 || input.age > 100) {
    throw new Error("Age must be between 18 and 100.");
  }

  if (input.faceAmount <= 0) {
    throw new Error("Face amount (coverage) must be greater than zero.");
  }

  if (input.faceAmount > 10000000) {
    throw new Error("Face amount cannot exceed $10,000,000.");
  }

  if (input.insuranceType === "TERM_LIFE") {
    if (input.termYears === undefined) {
      throw new Error("termYears is required for TERM_LIFE insurance.");
    }
    if (input.termYears <= 0 || input.termYears > 50) {
      throw new Error("Term years must be between 1 and 50.");
    }
  }

  if (input.coverageDecreaseRate !== undefined) {
    if (input.coverageDecreaseRate < 0 || input.coverageDecreaseRate >= 1) {
      throw new Error("Coverage decrease rate must be between 0 and 1 (exclusive of 1).");
    }
  }

  if (input.inflationAdjustment !== undefined) {
    if (input.inflationAdjustment < 0 || input.inflationAdjustment >= 1) {
      throw new Error("Inflation adjustment must be between 0 and 1 (exclusive of 1).");
    }
  }

  if (input.decimalPlaces !== undefined) {
    if (input.decimalPlaces < 0 || input.decimalPlaces > 10) {
      throw new Error("Decimal places must be between 0 and 10.");
    }
  }

  if (input.riders) {
    if (input.riders.accidentalDeathBenefitRate !== undefined) {
      if (
        input.riders.accidentalDeathBenefitRate < 0 ||
        input.riders.accidentalDeathBenefitRate > 100
      ) {
        throw new Error(
          "Accidental death benefit rate must be between 0 and 100 dollars per thousand."
        );
      }
    }
  }

  // Validate risk profile
  const validHealthStatuses = ["EXCELLENT", "GOOD", "FAIR", "POOR"];
  if (!validHealthStatuses.includes(input.riskProfile.healthStatus)) {
    throw new Error(`Invalid health status: ${input.riskProfile.healthStatus}`);
  }

  const validOccupationRisks = ["LOW", "MEDIUM", "HIGH"];
  if (!validOccupationRisks.includes(input.riskProfile.occupationRisk)) {
    throw new Error(`Invalid occupation risk: ${input.riskProfile.occupationRisk}`);
  }

  const validMedicalHistories = ["NONE", "MINOR_CONDITIONS", "CHRONIC_DISEASE", "SERIOUS_ILLNESS"];
  if (!validMedicalHistories.includes(input.riskProfile.medicalHistory)) {
    throw new Error(`Invalid medical history: ${input.riskProfile.medicalHistory}`);
  }
}
