import { Decimal } from "./decimal";


export type RoundingMode = 
| "HALF_UP"
| "HALF_EVEN"
| "DOWN"
| "UP";


export function applyRounding(
value: Decimal,
decimalPlaces: number,
mode: RoundingMode
): Decimal {
    const roundingMap = {
    HALF_UP : Decimal.ROUND_HALF_UP,
    HALF_EVEN: Decimal.ROUND_HALF_EVEN,
    UP: Decimal.ROUND_UP,
    DOWN: Decimal.ROUND_DOWN
    }

    return   value.toDecimalPlaces(decimalPlaces, roundingMap[mode])
}