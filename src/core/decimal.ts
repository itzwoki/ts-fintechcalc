import Decimal from "decimal.js";

/**
 * Global Decimal configuration for financial calculations.
 * 
 * precision: total significant digits
 * rounding: ROUND_HALF_UP (banking standard)
 * 
 * 0.1 + 0.2 = 0.30000000000000004 IN JS
 * new Decimal(0.1).plus(0.2) = 0.3  with decimal.js
 */

Decimal.set({
    precision: 28,
    rounding: Decimal.ROUND_HALF_UP
})

export { Decimal };