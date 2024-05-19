import { create } from "zustand";
import { WritableDraft } from "immer";
import { immer } from "zustand/middleware/immer";
import { Client } from "./client";
import { PublicKey, Field, UInt64 } from "o1js";
import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";
import { CreateOrder, OrderId, Order } from "chain/dist/order";
import { PaypalTxPublicData, PaypalTxProof } from "chain/dist/paypal"
import { enableMapSet } from "immer";

enableMapSet();

export interface OrdersState {
    loading: boolean;
    orders: Map<OrderId, Order>;
    getOrder: (client: Client, orderId: OrderId) => Promise<Order | undefined>;
    getOrders: (client: Client) => Promise<void>;
    publishOrder: (
        client: Client,
        sender: PublicKey,
        order: CreateOrder
    ) => Promise<void>;
    commitOrder: (
        client: Client,
        buyer: PublicKey,
        orderId: OrderId,
        senderIdHash: Field
    ) => Promise<void>;
    closeOrder: (
        client: Client,
        user: PublicKey,
        orderId: OrderId
    ) => Promise<void>;
    proofOrder: (
        client: Client,
        proof: PaypalTxProof,
        orderId: OrderId,
        wallet: PublicKey
    ) => Promise<void>;
}

function isPendingTransaction(
    transaction: PendingTransaction | UnsignedTransaction | undefined
): asserts transaction is PendingTransaction {
    console.log("")
    if (!(transaction instanceof PendingTransaction))
        throw new Error("Transaction is not a PendingTransaction");
}

export const useOrdersStore = create<OrdersState, [["zustand/immer", never]]>(
    immer((set) => ({
        loading: Boolean(false),
        orders: new Map<OrderId, Order>(),
        async getOrder(client: Client, orderId: OrderId) {
            const order = await client.query.runtime.OrderBook.orders.get(orderId);
            return order;
        },
        async getOrders(client: Client) {
            if (!client) {
                return
            }
            try {
                const indexLength = await client.query.runtime.OrderBook.orderIndexLength.get();
                const orders = new Map<string, Order>();
                if (indexLength && indexLength.greaterThan(new UInt64(1))) {
                    for (let i = 0; i < indexLength.toBigInt(); i++) {
                        try {
                            const orderId = await client.query.runtime.OrderBook.orderIndex.get(UInt64.from(i));
                            if (orderId) {
                                const order = await client.query.runtime.OrderBook.orders.get(orderId);
                                if (order) {
                                    console.log(order.deleted.toBoolean())
                                    orders.set(orderId.toString(), order);
                                }
                            }
                        } catch (error) {
                            console.error(`Failed to fetch order at index ${i.toString()}:`, error);
                        }
                    }
                }

                set((state) => ({
                    ...state,
                    orders: orders,
                }));
            } catch (error) {
                console.error('Failed to fetch orders:', error);
            }
        },
        async publishOrder(client: Client, sender: PublicKey, order: CreateOrder) {
            set((state) => {
                state.loading = true;
            });

            const orders = client.runtime.resolve("OrderBook");

            const tx = await client.transaction(sender, async () => {
                orders.createOrder(order);
            });

            await tx.sign();
            await tx.send();

            console.log("tx = ", tx);
            console.log("tx.transaction = ", tx.transaction);

            // isPendingTransaction(tx.transaction);

            set((state) => {
                state.loading = false;
            });

        },
        async commitOrder(client: Client, buyer: PublicKey, orderId: OrderId, senderIdHash: Field) {
            set((state) => {
                state.loading = true;
            });

            const orders = client.runtime.resolve("OrderBook");

            const tx = await client.transaction(buyer, async () => {
                orders.lockOrder(orderId, senderIdHash);

            });

            await tx.sign();
            await tx.send();

            set((state) => {
                state.loading = false;
            });
        },
        async closeOrder(client: Client, user: PublicKey, orderId: OrderId) {
            set((state) => {
                state.loading = true;
            });

            const orders = client.runtime.resolve("OrderBook");

            const tx = await client.transaction(user, async () => {
                orders.closeOrder(orderId);
            });

            await tx.sign();
            await tx.send();

            set((state) => {
                state.loading = false;
            });
        },
        async proofOrder(client: Client, proof: PaypalTxProof, orderId: OrderId, wallet: PublicKey) {
            const paypalTxProof = new PaypalTxProof({
                publicInput: proof.publicInput,
            });

            const tx = await client.transaction((wallet), async () => {
                const orders = client.runtime.resolve('OrderBook');
                orders.runOrder(paypalTxProof);
            });

            await tx.sign();
            await tx.send();
        }
    }))
);
