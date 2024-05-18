import { Field, Poseidon, PublicKey, Struct } from "o1js";

export class OrderLock extends Struct({
  lock: Field,
}) {
  // smart constructor
  public static create({
    usd_sender_id_hash,
    sender_public_key,
  }: {
    usd_sender_id_hash: Field,
    sender_public_key: PublicKey
  }): OrderLock {
    const lock = Poseidon.hash([usd_sender_id_hash, ...sender_public_key.toFields()]);

    return new OrderLock({ lock });
  }

  public static empty(): OrderLock {
    return new OrderLock({ lock: Field.from(0) });
  }
}
