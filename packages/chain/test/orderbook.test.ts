import { TestingAppChain } from "@proto-kit/sdk";
import { Field, PrivateKey, PublicKey, UInt64 } from "o1js";
import { log } from "@proto-kit/common";
import { Balance, Balances, BalancesKey, TokenId } from "@proto-kit/library";
import { OrderBook } from "../src/order-book"
import { OrderId } from "../src/order";
import { DummyInvalidProof, compileZkProgram } from "../src/paypal";
import { ProveExternalUsdTx, ExternalUsdTxProof, FakeProofPrivateData, UsdTxPublicData } from "proofs/dist/index.js"

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
        valid_until: UInt64.from(19),
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

    expect(order?.valid_until.toBigInt()).toBe(19n);

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
        valid_until: UInt64.from(20),
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

    expect(order?.valid_until.toBigInt()).toBe(20n);

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

  it("TODO: should not be able to lock an invalid order", async () => {

  })

  it("should not be able to run an order without a valid (mock) proof and able with the valid proof", async () => {

    appChain.setSigner(alicePrivateKey);

    const oid = new OrderId(10);

    const amount_usd = UInt64.from(100)
    const usd_receiver_id_hash = new Field(0)
    const tx1 = await appChain.transaction(alice, async () => {
      orderbook().createOrder({
        order_id: oid,
        valid_until: UInt64.from(10),
        token_id: TokenId.from(0), // mina
        amount_token: Balance.from(100),
        amount_usd,
        usd_receiver_id_hash
      });
    });

    await tx1.sign();
    await tx1.send();

    const block = await appChain.produceBlock();

    expect(block?.height.equals(8));

    const order = await appChain.query.runtime.OrderBook.orders.get(oid);

    const count = await appChain.query.runtime.OrderBook.orderIndexLength.get();
    expect(count?.toBigInt()).toEqual(3n)

    const bk = new BalancesKey({ tokenId, address: alice })
    const balance = await appChain.query.runtime.OrderBook.balances.get(bk);

    expect(block?.transactions[0].status.toBoolean()).toBe(true);

    expect(order?.valid_until.toBigInt()).toBe(10n);

    expect(balance?.toBigInt()).toBe(100n);

    // should not be deleted
    expect(order?.deleted.toBoolean()).toBe(false);

    appChain.setSigner(bobPrivateKey);

    const usd_sender_id_hash = new Field(2)
    const tx2 = await appChain.transaction(bob, async () => {
      orderbook().lockOrder(oid, usd_sender_id_hash)
    });

    await tx2.sign();
    await tx2.send();

    const block2 = await appChain.produceBlock();
    expect(block2?.height.equals(9));

    const order2 = await appChain.query.runtime.OrderBook.orders.get(oid);

    // valid transaction
    expect(block2?.transactions[0].status.toBoolean()).toBe(true);

    // should not be deleted
    expect(order2?.deleted.toBoolean()).toBe(false);

    // should be locked until
    expect(order2?.locked_until.toBigInt()).toBe(12n); // 9 + 3

    // lock should not be zero
    expect(order2?.lock.lock.toBigInt()).toBeGreaterThan(0n);

    // ------------------------
    // PROVING
    const invalidSecretInput = new FakeProofPrivateData({
      usd_amount: amount_usd,
      usd_receiver_id_hash,
      usd_sender_id_hash: new Field(0),
      sender_private_key: bob
    }
    )

    const publicInput = new UsdTxPublicData({orderId: oid})

    await compileZkProgram()
    const proof = await ProveExternalUsdTx.fakeProof(publicInput, invalidSecretInput);

    const tx3 = await appChain.transaction(bob, async () => {
      orderbook().runOrder(proof)
    });
    await tx3.sign();
    await tx3.send();

    const block3 = await appChain.produceBlock();
    expect(block3?.height.equals(10));

    // valid transaction
    expect(block3?.transactions[0].status.toBoolean()).toBe(false);



  }, 1_000_000);
});
