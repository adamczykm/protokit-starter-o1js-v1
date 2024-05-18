import { Balance, TokenId } from "@proto-kit/library";
import { Bool, Field, PublicKey, Struct, UInt64 } from "o1js";
import { OrderLock } from "./order-lock";

export class OrderId extends UInt64 {}

export class CreateOrder extends Struct({
  order_id: OrderId,
  valid_until: UInt64, // -- TODO IMPR: L2 block height for now
  token_id: TokenId,
  amount_token: Balance,
  amount_usd: UInt64,
  usd_receiver_id_hash: Field
}) {}

export class Order extends Struct({
  locked_until: UInt64, //  -- TODO IMPR: L2 block height for now
  creator_pubkey: PublicKey,
  // -
  valid_until: UInt64, // -- TODO IMPR: L2 block height for now
  token_id: TokenId,
  amount_token: Balance,
  amount_usd: UInt64,
  usd_receiver_id_hash: Field,
  // -
  lock: OrderLock,
  deleted: Bool
}) {

  public static create(order_details: CreateOrder, creator_pubkey: PublicKey): Order {
    return new Order({
      creator_pubkey,
      locked_until: UInt64.zero,
      valid_until: order_details.valid_until,
      token_id: order_details.token_id,
      amount_token: order_details.amount_token,
      amount_usd: order_details.amount_usd,
      usd_receiver_id_hash: order_details.usd_receiver_id_hash,
      lock: OrderLock.empty(),
      deleted: Bool(false)
    });
  }
}

export const DeletedOrder = new Order({
  locked_until: UInt64.zero,
  creator_pubkey: PublicKey.fromFields([Field.from(0),Field.from(0)]),
  valid_until: UInt64.zero,
  token_id: TokenId.from(0),
  amount_token: Balance.from(0),
  amount_usd: UInt64.zero,
  usd_receiver_id_hash: Field.from(0),
  lock: OrderLock.empty(),
  deleted: Bool(false)
});
