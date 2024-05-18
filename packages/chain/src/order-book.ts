import { runtimeModule, state, runtimeMethod, RuntimeModule } from "@proto-kit/module";
import { StateMap, assert, } from "@proto-kit/protocol";
import { CreateOrder, DeletedOrder, Order, OrderId } from "./order";
import { Bool, Field, Poseidon, UInt64 } from "o1js";
import { OrderLock } from "./order-lock";
import { PaypalTxProof } from "./paypal";
import { UsdTxProofData } from "./usd-tx";

interface OrderBookConfig {
  minTokenAmount: UInt64,
  maxValidityPeriod: UInt64,
  lockPeriod: UInt64, // amount of l2 blocks from now
}

@runtimeModule()
export class OrderBook extends RuntimeModule<OrderBookConfig> {

  @state() public orders = StateMap.from<OrderId, Order>(OrderId, Order);


  /// OFF-RAMPING

  // create order
  @runtimeMethod()
  public async createOrder(
    order_details: CreateOrder
  ): Promise<void> {
    const creator_pkh = Poseidon.hash(this.transaction.sender.value.toFields())

    // TODO: do checks!

    const order = Order.create(order_details, creator_pkh);
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
    const order: Order = this.orders.get(order_id).value; // TODO: check if it exists

    // only the creator can manually close the order
    assert(order.creator_pkh.equals(creator_pkh), "Only the creator can close the order");

    // it must be unlocked
    assert(order.locked_until.lessThanOrEqual(this.network.block.height), "Order is still locked");

    // TODO: transfer tokens back to the creator
    this.orders.set(order_id, DeletedOrder);
  }


  /// ON-RAMPING

  // list is provided via sequencer graphql somehow


  // lock the order
  @runtimeMethod()
  public async lockOrder(
    order_id: OrderId,
    usd_sender_id_hash: Field
  ): Promise<void> {

    const current_block = this.network.block.height;
    const new_locked_until = current_block.add(this.config.lockPeriod);

    const order: Order = this.orders.get(order_id).value; // TODO: check if it exists

    // it must be valid
    assert(order.valid_until.lessThanOrEqual(this.network.block.height), "Order is not valid");

    // it must be unlocked
    assert(order.locked_until.lessThanOrEqual(this.network.block.height), "Order is still locked");

    // create and set the lock
    const new_lock = OrderLock.create({usd_sender_id_hash, sender_public_key: this.transaction.sender.value});

    // ! lock it
    this.orders.set(order_id, new Order({
      ...order,
      lock: new_lock,
      locked_until: new_locked_until
    }));
  }

  // run the order, requires proof of the paypal transaction that matches all the details
  @runtimeMethod()
  public async runOrder(
    paypal_tx_proof: PaypalTxProof
  ): Promise<void> {
    // --------
    // proof initial checks

    // it must be valid
    paypal_tx_proof.mockVerify();
    const order_id = paypal_tx_proof.publicInput.orderId;

    // --------
    // order checks
    // must exist
    const order: Order = this.orders.get(order_id).value; // TODO: check if it exists
    // must not be deleted
    assert(order.deleted.equals(Bool(false)), "Order does not exist");

    // it must be locked
    assert(order.locked_until.greaterThanOrEqual(this.network.block.height), "Order is not locked");

    // --------
    /// do the proof data check
    const proof_data_hash_from_order = UsdTxProofData.fromLockedOrder(order).hash();
    const proof_data_hash_from_proof = paypal_tx_proof.publicInput.usdTxProofDataHash;

    assert(proof_data_hash_from_order.equals(proof_data_hash_from_proof), "Proof data does not match the order");

    // TODO! transfer the tokens

    // delete the order
    this.orders.set(order_id, DeletedOrder);
  }
}
