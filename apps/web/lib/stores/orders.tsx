import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { Client } from "./client";
import { PublicKey, UInt64 } from "o1js";
import { PendingTransaction, UnsignedTransaction } from "@proto-kit/sequencer";

export interface Order {
    id: string;
    amount: UInt64;
    status: string;
}

export interface OrdersState {
    loading: boolean;
    orders: Order[];
    fetchOrders: (client: Client) => Promise<Order[]>;
    publishOrder: (
        client: Client,
        paypalId: string,
        sender: PublicKey,
        amount: UInt64,
        price: string
    ) => Promise<PendingTransaction>;
    commitOrder: (
        client: Client,
        orderId: string,
        buyer: PublicKey
    ) => Promise<void>;
    verifyEmail: (
        client: Client,
        orderId: string,
        emailContent: string
    ) => Promise<void>;
}

function isPendingTransaction(
    transaction: PendingTransaction | UnsignedTransaction | undefined
): asserts transaction is PendingTransaction {
    if (!(transaction instanceof PendingTransaction))
        throw new Error("Transaction is not a PendingTransaction");
}

export const useOrdersStore = create<OrdersState, [["zustand/immer", never]]>(
    immer((set) => ({
        loading: Boolean(false),
        orders: [],
        async fetchOrders(client: Client): Promise<Order[]> {
            set((state) => {
                state.loading = true;
            });

            const orders = client.query.runtime.Orders.orders.getAll();

            set((state) => {
                state.orders = orders;
                state.loading = false;
            });

            return orders;
        },
        async publishOrder(client: Client, paypalId: string, sender: PublicKey, amount: UInt64, price: string) {
            set((state) => {
                state.loading = true;
            });

            const orders = client.runtime.resolve("Orders");

            const tx = await client.transaction(sender, () => {
                orders.publishOrder(paypalId, sender, amount, price);
            });

            await tx.sign();
            await tx.send();

            isPendingTransaction(tx.transaction);

            set((state) => {
                state.loading = false;
            });

            return tx.transaction;
        },
        async commitOrder(client: Client, orderId: string, buyer: PublicKey) {
            set((state) => {
                state.loading = true;
            });

            const orders = client.runtime.resolve("Orders");

            const tx = await client.transaction(buyer, () => {
                orders.commitOrder(orderId, buyer);

            });

            await tx.sign();
            await tx.send();

            set((state) => {
                state.loading = false;
            });
        },
        async verifyEmail(client: Client, orderId: string, emailContent: string) {
            set((state) => {
                state.loading = true;
            });

            const orders = client.runtime.resolve("Orders"); await client.query.runtime.Balances.balances.get(key);

            const tx = await client.transaction(PublicKey.fromBase58(orderId), () => {
                orders.verifyEmail(orderId, emailContent);
            });

            await tx.sign();
            await tx.send();

            set((state) => {
                state.loading = false;
            });
        },
    }))
);
