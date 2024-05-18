import { runtimeModule, state, runtimeMethod } from "@proto-kit/module";
import { StateMap, assert, } from "@proto-kit/protocol";
import { Balances as BaseBalances } from "@proto-kit/library";
import { CreateOrder, DeletedOrder, DeletedOrderId, Order, OrderId } from "./order";
import { Poseidon, UInt64 } from "o1js";

interface OrderBookConfig {
  minTokenAmount: UInt64,
  maxValidityPeriod: UInt64
}

@runtimeModule()
export class Balances extends BaseBalances<OrderBookConfig> {

  @state() public orders = StateMap.from<OrderId, Order>(OrderId, Order);

  // create order
  @runtimeMethod()
  public async createOrder(
    order_details: CreateOrder
  ): Promise<void> {
    const creator_pkh = Poseidon.hash(this.transaction.sender.value.toFields())

    // TODO: do checks!


    // order_id cannot be deleted order id
    assert(order_details.order_id.equals(DeletedOrderId).not(), "Order id cannot be deleted order id");

    const order = new Order({
      order_id: order_details.order_id,
      creator_pkh,
      locked_until: UInt64.from(0),
      valid_until: order_details.valid_until,
      token_id: order_details.token_id,
      amount_token: order_details.amount_token,
      amount_usd: order_details.amount_usd,
      paypal_id: order_details.paypal_id
    });

    // TODO: if order exists, fail
    this.orders.set(order_details.order_id, order);

    // TODO: transfer tokens to the balances
  }

  // close order
  @runtimeMethod()
  public async closeOrder(
    order_id: OrderId
  ): Promise<void> {
    const creator_pkh = Poseidon.hash(this.transaction.sender.value.toFields())
    const order: Order = this.orders.get(order_id).value;

    // only the creator can manually close the order
    assert(order.creator_pkh.equals(creator_pkh), "Only the creator can close the order");

    // it must be unlocked
    assert(order.locked_until.lessThanOrEqual(this.network.block.height), "Order is still locked");

    // TODO: transfer tokens back to the creator
    this.orders.set(order_id, DeletedOrder);
  }



  // @runtimeMethod()
  // public async addBalance(
  //   tokenId: TokenId,
  //   address: PublicKey,
  //   amount: Balance
  // ): Promise<void> {
  //   const circulatingSupply = this.circulatingSupply.get();
  //   const newCirculatingSupply = Balance.from(circulatingSupply.value).add(
  //     amount
  //   );
  //   assert(
  //     newCirculatingSupply.lessThanOrEqual(this.config.totalSupply),
  //     "Circulating supply would be higher than total supply"
  //   );
  //   this.circulatingSupply.set(newCirculatingSupply);
  //   this.mint(tokenId, address, amount);
  // }
}
