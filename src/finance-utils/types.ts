export type PaymentTiming = "END" | "BEGIN";

export interface PresentValueInput {
  futureValue?: number;
  payment?: number;
  rate: number;
  periods: number;
  paymentTiming?: PaymentTiming;
}

export interface FutureValueInput {
  presentValue?: number;
  payment?: number;
  rate: number;
  periods: number;
  paymentTiming?: PaymentTiming;
}
