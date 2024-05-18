import { TokenId } from "@proto-kit/library";
import { Field, Struct, UInt64, CircuitString } from "o1js";


export class PaypalId extends Struct({
  value: Field
}) {
  public static fromString(value: string): PaypalId {
    return new PaypalId({ value: CircuitString.fromString(value).hash() });
  }

}


export class OrderId extends UInt64 {}

export class CreateOrder extends Struct({
  order_id: OrderId,
  valid_until: UInt64, // -- TODO IMPR: L2 block height for now
  token_id: TokenId,
  amount_token: UInt64,
  amount_usd: UInt64,
  paypal_id: PaypalId,
}) {
}

export class Order extends Struct({
  locked_until: UInt64, // 0 = unlocked  -- TODO IMPR: L2 block height for now
  creator_pkh: Field,
  // -
  order_id: OrderId,
  valid_until: UInt64, // -- TODO IMPR: L2 block height for now
  token_id:  TokenId,
  amount_token: UInt64,
  amount_usd: UInt64,
  paypal_id: PaypalId
}) {
}

export const DeletedOrderId = new OrderId(UInt64.zero);

export const DeletedOrder = new Order({
  locked_until: UInt64.zero,
  creator_pkh: Field.from(0),
  order_id: DeletedOrderId,
  valid_until: UInt64.zero,
  token_id: TokenId.from(0),
  amount_token: UInt64.zero,
  amount_usd: UInt64.zero,
  paypal_id: PaypalId.fromString("")
});
