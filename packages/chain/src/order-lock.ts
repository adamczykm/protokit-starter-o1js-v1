import { Field, Poseidon, Struct } from "o1js";
import { PaypalId } from "./order";

export class OrderLock extends Struct({
  lock: Field,
}) {
  // smart constructor
  public static mk({
    sender_paypal_id,
    sender_pkh,
  }: {
    sender_paypal_id: PaypalId;
    sender_pkh: Field;
  }): OrderLock {
    const lock = Poseidon.hash([sender_pkh, sender_paypal_id.value]);

    return new OrderLock({ lock });
  }
}
