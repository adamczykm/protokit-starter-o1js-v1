import { CircuitString, Field, Poseidon, PublicKey, Struct, UInt64 } from "o1js";
import { OrderLock } from "./order-lock";
import { Order } from "./order";

export class UsdTxProofData extends Struct({
  usd_amount: UInt64,
  usd_receiver_id_hash: Field,
  lock_data: Field
}) {

  public hash(): Field {
    return Poseidon.hash([
      this.usd_amount.value,
      this.usd_receiver_id_hash,
      this.lock_data
    ]);
  }

  // order must be locked
  public static fromLockedOrder(order: Order): UsdTxProofData {
    return new UsdTxProofData({
      usd_amount: order.amount_usd,
      usd_receiver_id_hash: order.usd_receiver_id_hash,
      lock_data: order.lock.lock
    });
  }

  // from the proof secret data
  public static fromProofSecretData(
    usd_amount: UInt64,
    usd_receiver_id: CircuitString,
    usd_sender_id: CircuitString,
    sender_public_key: PublicKey
  ): UsdTxProofData {

    const usd_receiver_id_hash = usd_receiver_id.hash();
    const usd_sender_id_hash = usd_sender_id.hash();
    const lock_data = OrderLock.create({
      usd_sender_id_hash,
      sender_public_key
    }).lock;

    return new UsdTxProofData({
      usd_amount,
      usd_receiver_id_hash,
      lock_data
    });
  }
}
