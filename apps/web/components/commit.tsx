"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientStore } from "@/lib/stores/client";
import { useOrdersStore, Order } from "@/lib/stores/orders";
import { useEffect, useState } from "react";
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { PublicKey } from "o1js";

export interface CommitOrderProps {
    wallet?: string;
    onConnectWallet: () => void;
    loading: boolean;
    setLoading: (loading: boolean) => void;
}

export function CommitOrderInternal({
    wallet,
    loading,
    setLoading,
}: CommitOrderProps) {
    const client = useClientStore((state) => state.client);
    const { fetchOrders, commitOrder, verifyEmail } = useOrdersStore((state) => ({
        fetchOrders: state.fetchOrders,
        commitOrder: state.commitOrder,
        verifyEmail: state.verifyEmail
    }));
    const [orders, setOrders] = useState<Order[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const currency_code = "USD";

    // useEffect(() => {
    //     const loadOrders = async () => {
    //         if (client) {
    //             const ordersList = await fetchOrders(client);
    //             setOrders(ordersList);
    //         }
    //     };

    //     loadOrders();
    // }, [client]);

    const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
    if (!paypalClientId) {
        throw new Error("PayPal Client ID is not defined. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID in your environment variables.");
    }

    const handleCommit = async (order: Order) => {
        setLoading(true);
        try {
            if (client && wallet) {
                await commitOrder(client, order.id, PublicKey.fromBase58(wallet));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (event: any, order: Order) => {
        const file = event.target.files[0];
        setLoading(true);
        try {
            if (file && client) {
                const emailContent = await file.text();
                await verifyEmail(client, order.id, emailContent);
            }
        } finally {
            setLoading(false);
        }
    };

    const [{ isPending, isResolved, isRejected }, dispatch] = usePayPalScriptReducer();

    useEffect(() => {
        dispatch({
            type: "resetOptions",
            value: {
                clientId: paypalClientId,
                currency: currency_code,
                intent: "capture",
            },
        });
    }, [paypalClientId, currency_code, dispatch]);

    return (
        <Card className="w-full p-4">
            <div className="mb-2">
                <h2 className="text-xl font-bold">Commit to Orders</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    Browse and commit to orders, then upload PayPal email for verification.
                </p>
            </div>

            {orders.map((order) => (
                <div key={order.id} className="mb-4">
                    <h3>Order #{order.id}</h3>
                    <p>Amount: {order.amount.toString()} MINA</p>
                    <p>Status: {order.status}</p>
                    <Button
                        size="sm"
                        onClick={() => handleCommit(order)}
                        loading={loading}
                    >
                        Commit to Order
                    </Button>
                    <input
                        type="file"
                        accept=".eml"
                        onChange={(e) => handleUpload(e, order)}
                    />
                </div>
            ))}

            {wallet && (
                <div className="mt-4">
                    {isPending && <div>Loading PayPal script...</div>}
                    {isResolved && (
                        <PayPalButtons
                            style={{
                                color: 'gold',
                                shape: 'rect',
                                label: 'pay',
                                height: 50
                            }}
                            createOrder={async (data, actions) => {
                                return actions.order.create({
                                    intent: "CAPTURE",
                                    purchase_units: [
                                        {
                                            amount: {
                                                currency_code,
                                                value: "50",
                                            },
                                        },
                                    ],
                                });
                            }}
                            onApprove={async (data, actions) => {
                                const details = await actions.order!.capture();
                                console.log('PayPal payment approved:', details);
                                console.log('Payer email address:', details.payer!.email_address);
                                console.log('Transaction amount:', details.purchase_units);
                                // Perform any additional actions with the payment details here

                                // Simulate committing the order after payment is approved
                                if (client && wallet && selectedOrder) {
                                    const toAddress = new PublicKey(wallet);
                                    await commitOrder(client, selectedOrder.id, PublicKey.fromBase58(wallet));
                                    alert(`Transaction completed by ${details.payer!.name}`);
                                }
                            }}
                            onError={(err) => {
                                console.error("PayPal Checkout onError", err);
                                // Handle the error accordingly
                            }}
                        />
                    )}
                    {isRejected && <div>Failed to load PayPal script</div>}
                </div>
            )}

        </Card>
    )
}

export function CommitOrder(props: CommitOrderProps) {
    const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
    const currency_code = "USD";

    return (
        <PayPalScriptProvider options={{ clientId: paypalClientId, currency: currency_code, intent: 'capture' }}>
            <CommitOrderInternal {...props} />
        </PayPalScriptProvider>
    );
}