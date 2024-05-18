import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Client } from "./client";
import { PublicKey, Field } from "o1js";
import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";
import { CreateOrder, OrderId, Order } from "chain/dist/order";

export interface OrdersState {
    loading: boolean;
    orders: {
        [key: string]: string;
    };
    getOrder: (client: Client, orderId: OrderId) => Promise<Order | undefined>;
    // fetchOrders: (client: Client) => Promise<Order[]>;
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
    // verifyEmail: (
    //     client: Client,
    //     orderId: OrderId,
    //     emailContent: string
    // ) => Promise<void>;
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
        orders: {},
        async getOrder(client: Client, orderId: OrderId) {
            const order = await client.query.runtime.OrderBook.orders.get(orderId);
            return order;
        },
        // async fetchOrders(client: Client): Promise<Order[]> {
        //     set((state) => {
        //         state.loading = true;
        //     });

        //     const orders = client.query.runtime.OrderBook.orders.get(new OrderId("test"));

        //     set((state) => {
        //         state.orders[orderId] = order;
        //         state.loading = false;
        //     });

        //     return orders;
        // },
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

            const orderId = order.order_id.toString();
            set((state) => {
                state.loading = false;
                state.orders[orderId] = orderId;
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
        // async verifyEmail(client: Client, orderId: OrderId, emailContent: string) {
        //     set((state) => {
        //         state.loading = true;
        //     });

        //     const orders = client.runtime.resolve("OrderBook"); await client.query.runtime.Balances.balances.get(key);

        //     const tx = await client.transaction(PublicKey.fromBase58(orderId), async () => {
        //         orders.verifyEmail(orderId, emailContent);
        //     });

        //     await tx.sign();
        //     await tx.send();

        //     set((state) => {
        //         state.loading = false;
        //     });
        // },
    }))
);
