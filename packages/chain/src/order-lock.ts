import { CircuitString, Field, Poseidon, Struct } from "o1js";

export class OrderLock extends Struct({
  lock: Field
}) {


  // smart constructor
  public static mk(
    sender_paypal_id: CircuitString,
    sender_pkh: Field,
  ) : OrderLock {

    const lock = Poseidon.hash(
      [ sender_pkh, sender_paypal_id.hash()])

    return new OrderLock({lock})

}
}
