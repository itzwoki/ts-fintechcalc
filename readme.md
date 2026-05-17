# FintechCalc

FintechCalc is a TypeScript financial calculation library focused on precision, modularity, and real-world finance features.
It covers loan amortization, compound investment growth, insurance premium modeling, and core finance utilities.

## Modules

### Amortization
- Fully amortizing loans
- Interest-only loans
- Bullet loans
- Balloon loans by percentage or amortization period
- Adjustable interest rate schedules
- Extra payments and early payoff detection
- Mortgage features: fees, closing costs, PMI, escrow, and yearly breakdowns
- Input validation and negative amortization protection

### Compound Interest
- Multiple compounding frequencies
- Recurring contributions
- Tax modeling for gains
- Inflation adjustment
- Nominal vs real return breakdown
- Detailed annual schedule output

### Insurance
- Term life and whole life pricing
- Risk multipliers for health, occupation, and medical history
- Coverage decrease and inflation adjustment
- Rider support for accidental death benefit and waiver of premium
- Annual schedule projection

### Finance Utilities
- Present Value (PV)
- Future Value (FV)
- Net Present Value (NPV)
- Internal Rate of Return (IRR)
- Effective Annual Rate (EAR)
- APR / nominal rate conversions

## Usage

Import from the package entry point:

```ts
import {
  calculateAmortization,
  calculateInsurancePremium,
  presentValue,
  futureValue,
  netPresentValue,
  internalRateOfReturn,
  effectiveAnnualRate,
  nominalRateFromEffectiveAnnualRate
} from "./src";
```

## Development

Run the test suite:

```bash
npm run test:run
```

## Notes

The library uses `decimal.js` for high-precision calculations and is designed to be used as a logic layer behind frontend or backend applications.
