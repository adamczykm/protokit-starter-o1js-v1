import { runtimeModule, state, runtimeMethod } from "@proto-kit/module";
import { StateMap, assert, } from "@proto-kit/protocol";
import { CreateOrder, DeletedOrder, Order, OrderId } from "./order";
import { Bool, Field, PublicKey, UInt64 } from "o1js";
import { OrderLock } from "./order-lock";
import { PaypalTxProof } from "./paypal";
import { UsdTxProofData } from "./usd-tx";
import { Balance, Balances as BaseBalances, TokenId } from "@proto-kit/library";

interface OrderBookConfig {
  minTokenAmount: UInt64,
  maxValidityPeriod: UInt64,
  lockPeriod: UInt64, // amount of l2 blocks from now
}

@runtimeModule()
export class OrderBook extends BaseBalances<OrderBookConfig> {
    @state() public orders = StateMap.from<OrderId, Order>(OrderId, Order);

    // no direct transfers
    @runtimeMethod()
    public override async transferSigned(
      _tokenId: TokenId,
      _from: PublicKey,
      _to: PublicKey,
      _amount: Balance
    ) {
      throw new Error("Not available in this module");
    }


    public async addBalance(
      tokenId: TokenId,
      amount: Balance
    ): Promise < void> {
      const address = this.transaction.sender.value;
      this.mint(tokenId, address, amount);
  }

    public async removeBalance(
      tokenId: TokenId,
      amount: Balance
    ): Promise < void> {
      const address = this.transaction.sender.value;
      this.burn(tokenId, address, amount);
    }


  /// OFF-RAMPING

  // create order
  @runtimeMethod()
  public async createOrder(
    order_details: CreateOrder
  ): Promise<void> {
    const creator_pubkey = this.transaction.sender.value;

    // TODO: do checks!

    const order = Order.create(order_details, creator_pubkey);
    // TODO: if order exists, fail
    this.orders.set(order_details.order_id, order);

    // TODO: mocked - you create the money by creating the order
    this.addBalance(
      order_details.token_id,
      order_details.amount_token,
    );
  }

  // close order
  @runtimeMethod()
  public async closeOrder(
    order_id: OrderId
  ): Promise<void> {
    const creator_pubkey = this.transaction.sender.value;
    const order: Order = this.orders.get(order_id).value; // TODO: check if it exists

    // only the creator can manually close the order
    assert(order.creator_pubkey.equals(creator_pubkey), "Only the creator can close the order");

    // it must be unlocked
    assert(order.locked_until.lessThanOrEqual(this.network.block.height), "Order is still locked");

    // TODO: transfer tokens back to the creator
    // MOCKED: it just burns the tokens
    this.removeBalance(
      order.token_id,
      order.amount_token
    );

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

    const sender = this.transaction.sender.value;
    this.transfer(
      order.token_id,
      order.creator_pubkey,
      sender,
      order.amount_token
    );

    // delete the order
    this.orders.set(order_id, DeletedOrder);
  }
}
