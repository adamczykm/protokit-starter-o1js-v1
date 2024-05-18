import { TestingAppChain } from "@proto-kit/sdk";
import { Field, PrivateKey, PublicKey, UInt64 } from "o1js";
import { log } from "@proto-kit/common";
import { Balance, Balances, BalancesKey, TokenId } from "@proto-kit/library";
import { OrderBook } from "../src/order-book"
import { OrderId } from "../src/order";

log.setLevel("debug");

// the tests must be run sequqentially
describe("order-book", () => {
  let alicePrivateKey: PrivateKey;
  let alice: PublicKey;

  let bobPrivateKey: PrivateKey;
  let bob: PublicKey;
  let tokenId: TokenId;

  const appChain = TestingAppChain.fromRuntime({
    Balances,
    OrderBook
  });

  const orderbook = () => {
    return appChain.runtime.resolve("OrderBook");
  }

  beforeAll(async () => {

    appChain.configurePartial({
      Runtime: {
        Balances: {
          totalSupply: UInt64.from(10000),
        },
        OrderBook: {
          minTokenAmount: UInt64.from(1),
          maxValidityPeriod: UInt64.from(5),
          lockPeriod: UInt64.from(3)
        }
      },
    });

    await appChain.start();

    alicePrivateKey = PrivateKey.random();
    alice = alicePrivateKey.toPublicKey();
    bobPrivateKey = PrivateKey.random();
    bob = bobPrivateKey.toPublicKey();
    tokenId = TokenId.from(0);
  });

  it("should be able to create an order", async () => {


    appChain.setSigner(alicePrivateKey);

    const oid = new OrderId(1);

    const tx1 = await appChain.transaction(alice, async () => {
      orderbook().createOrder({
        order_id: oid,
        valid_until: UInt64.from(3),
        token_id: TokenId.from(0), // mina
        amount_token: Balance.from(100),
        amount_usd: UInt64.from(100),
        usd_receiver_id_hash: Field(0)
      });
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    const order = await appChain.query.runtime.OrderBook.orders.get(oid);

    const count = await appChain.query.runtime.OrderBook.orderIndexLength.get();
    expect(count?.toBigInt()).toEqual(1n)

    const bk = new BalancesKey({ tokenId, address: alice })
    const balance = await appChain.query.runtime.OrderBook.balances.get(bk);

    expect(block?.transactions[0].status.toBoolean()).toBe(true);

    expect(order?.valid_until.toBigInt()).toBe(3n);

    expect(balance?.toBigInt()).toBe(100n);

    // should not be deleted
    expect(order?.deleted.toBoolean()).toBe(false);


  }, 1_000_000);

  it("should be able to create another order", async () => {

    appChain.setSigner(alicePrivateKey);

    const oid = new OrderId(2);

    const tx1 = await appChain.transaction(alice, async () => {
      orderbook().createOrder({
        order_id: oid,
        valid_until: UInt64.from(4),
        token_id: TokenId.from(0), // mina
        amount_token: Balance.from(100),
        amount_usd: UInt64.from(100),
        usd_receiver_id_hash: Field(0)
      });
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    const order = await appChain.query.runtime.OrderBook.orders.get(oid);

    const bk = new BalancesKey({ tokenId, address: alice })
    const balance = await appChain.query.runtime.OrderBook.balances.get(bk);

    expect(block?.transactions[0].status.toBoolean()).toBe(true);

    expect(order?.valid_until.toBigInt()).toBe(4n);

    expect(balance?.toBigInt()).toBe(200n);

    // should not be deleted
    expect(order?.deleted.toBoolean()).toBe(false);

    const count = await appChain.query.runtime.OrderBook.orderIndexLength.get();
    expect(count?.toBigInt()).toEqual(2n)

  }, 1_000_000);


  it("should be able to cancel an unlocked order", async () => {

    appChain.setSigner(alicePrivateKey);

    const oid = new OrderId(1);

    const tx1 = await appChain.transaction(alice, async () => {
      orderbook().closeOrder(oid)
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    const order = await appChain.query.runtime.OrderBook.orders.get(oid);

    const bk = new BalancesKey({ tokenId, address: alice })
    const balance = await appChain.query.runtime.OrderBook.balances.get(bk);
    expect(balance?.toBigInt()).toBe(100n);

    expect(block?.transactions[0].status.toBoolean()).toBe(true);

    // should be deleted
    expect(order?.deleted.toBoolean()).toBe(true);

  }, 1_000_000);

  it("should not be able to cancel an unlocked order if not the owner", async () => {

    appChain.setSigner(bobPrivateKey);

    const oid = new OrderId(2);

    let order = await appChain.query.runtime.OrderBook.orders.get(oid);

    const tx1 = await appChain.transaction(bob, async () => {
      orderbook().closeOrder(oid)
    });

    await tx1.sign();
    await tx1.send();


    const block = await appChain.produceBlock();
    expect(block?.height.equals(3));

    expect(order?.deleted.toBoolean()).toBe(false);
    order = await appChain.query.runtime.OrderBook.orders.get(oid);

    expect(block?.transactions[0].status.toBoolean()).toBe(false);

    // should not be deleted
    expect(order?.deleted.toBoolean()).toBe(false);

  }, 1_000_000);

  it("should be able to lock an unlocked order", async () => {

    appChain.setSigner(bobPrivateKey);

    const oid = new OrderId(2);

    const tx1 = await appChain.transaction(bob, async () => {
      orderbook().lockOrder(oid, Field(3))
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();
    expect(block?.height.equals(4));

    const order = await appChain.query.runtime.OrderBook.orders.get(oid);

    // valid transaction
    expect(block?.transactions[0].status.toBoolean()).toBe(true);

    // should not be deleted
    expect(order?.deleted.toBoolean()).toBe(false);

    // should be locked until
    expect(order?.locked_until.toBigInt()).toBe(7n);

    // lock should not be zero
    expect(order?.lock.lock.toBigInt()).toBeGreaterThan(0n);

  }, 1_000_000);

  it("should not be able to lock a locked order", async () => {

    appChain.setSigner(bobPrivateKey);

    const oid = new OrderId(2);

    const tx1 = await appChain.transaction(bob, async () => {
      orderbook().lockOrder(oid, Field(3))
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();
    expect(block?.height.equals(5));

    // invalid transaction
    expect(block?.transactions[0].status.toBoolean()).toBe(false);

  }, 1_000_000);

  it("should not be able to cancel a locked order", async () => {

    appChain.setSigner(alicePrivateKey);

    const oid = new OrderId(2);

    const tx1 = await appChain.transaction(alice, async () => {
      orderbook().closeOrder(oid)
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();
    expect(block?.height.equals(6));

    let order = await appChain.query.runtime.OrderBook.orders.get(oid);
    expect(order?.locked_until.toBigInt()).toBe(7n);

    const bk = new BalancesKey({ tokenId, address: alice })
    const balance = await appChain.query.runtime.OrderBook.balances.get(bk);

    expect(block?.transactions[0].status.toBoolean()).toBe(false);

    expect(balance?.toBigInt()).toBe(100n);

  }, 1_000_000);

  it("should be able to cancel a locked order if locked time passed", async () => {

    appChain.setSigner(alicePrivateKey);

    const oid = new OrderId(2);

    const tx1 = await appChain.transaction(alice, async () => {
      orderbook().closeOrder(oid)
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();
    expect(block?.height.equals(7));

    let order = await appChain.query.runtime.OrderBook.orders.get(oid);

    expect(order?.deleted.toBoolean()).toBe(true);

    const bk = new BalancesKey({ tokenId, address: alice })
    const balance = await appChain.query.runtime.OrderBook.balances.get(bk);
    expect(balance?.toBigInt()).toBe(0n);

    const count = await appChain.query.runtime.OrderBook.orderIndexLength.get();
    expect(count?.toBigInt()).toEqual(2n)

  }, 1_000_000);


  it("Order indices work as expected", async () => {

    const count = await appChain.query.runtime.OrderBook.orderIndexLength.get();
    expect(count?.toBigInt()).toEqual(2n)

    const index0 = await appChain.query.runtime.OrderBook.orderIndex.get(UInt64.from(0));
    expect(index0?.toBigInt()).toEqual(1n)

    const index1 = await appChain.query.runtime.OrderBook.orderIndex.get(UInt64.from(1));
    expect(index1?.toBigInt()).toEqual(2n)

  })
});
