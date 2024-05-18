"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientStore } from "@/lib/stores/client";
import { useOrdersStore } from "@/lib/stores/orders";
import { useEffect, useState } from "react";
// import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from "@paypal/react-paypal-js";
import { PublicKey, CircuitString, Field, UInt64 } from "o1js";
import { OrderId, Order } from "chain/dist/order"

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
    // const { fetchOrders, commitOrder, verifyEmail } = useOrdersStore((state) => ({
    //     fetchOrders: state.fetchOrders,
    //     commitOrder: state.commitOrder,
    //     verifyEmail: state.verifyEmail
    // }));
    const { orders, getOrder, commitOrder, closeOrder } = useOrdersStore((state) => ({
        orders: state.orders,
        getOrder: state.getOrder,
        commitOrder: state.commitOrder,
        closeOrder: state.closeOrder,
        // verifyEmail: state.verifyEmail
    }));
    const [orderList, setOrderList] = useState<Map<string, Order>>(new Map());
    const [paypalId, setPaypalId] = useState<string>("");

    // const currency_code = "USD";

    useEffect(() => {
        const fetchOrders = async () => {
            console.log("[fetchOrders] orders = ", orders)
            if (client) {
                const orderPromises = Object.values(orders).map((orderId) =>
                    getOrder(client, OrderId.from(orderId))
                );
                const resolvedOrders = await Promise.all(orderPromises);
                const newOrderList = new Map<string, Order>();
                resolvedOrders.forEach((order, index) => {
                    if (order) {
                        newOrderList.set(Object.keys(orders)[index], order);
                    }
                });
                console.log("[fetchOrders] newOrderList = ", newOrderList)
                setOrderList(newOrderList);
            }
        };

        fetchOrders();
    }, [client, orders, getOrder]);

    // const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
    // if (!paypalClientId) {
    //     throw new Error("PayPal Client ID is not defined. Please set NEXT_PUBLIC_PAYPAL_CLIENT_ID in your environment variables.");
    // }

    const handleCommit = async (orderId: OrderId, senderPaypalId: string) => {
        setLoading(true);
        try {
            if (client && wallet) {
                const sender = Field.from(CircuitString.fromString(senderPaypalId).hash());
                await commitOrder(client, PublicKey.fromBase58(wallet), orderId, sender);
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
                // await verifyEmail(client, order.id, emailContent);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = async (orderId: OrderId) => {
        setLoading(true);
        try {
            if (client && wallet) {
                await closeOrder(client, PublicKey.fromBase58(wallet), orderId);
            }
        } finally {
            setLoading(false);
        }
    };

    // const [{ isPending, isResolved, isRejected }, dispatch] = usePayPalScriptReducer();

    // useEffect(() => {
    //     dispatch({
    //         type: "resetOptions",
    //         value: {
    //             clientId: paypalClientId,
    //             currency: currency_code,
    //             intent: "capture",
    //         },
    //     });
    // }, [paypalClientId, currency_code, dispatch]);

    return (
        <Card className="w-full p-4">
            <div className="mb-2">
                <h2 className="text-xl font-bold">Commit to Orders</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    Browse and commit to orders, then upload PayPal email for verification.
                </p>
            </div>

            {Array.from(orderList.entries()).map(([orderId, order]) => (
                <div key={orderId} className="mb-4">
                    <h3>Order #{orderId}</h3>
                    <p>Amount: {order.amount_token.toString()} MINA</p>
                    <p>Price: {order.amount_usd.toString()} $</p>
                    <p>Valid Until: {order.valid_until.toString()}</p>
                    <p>Locked: {order.locked_until?.toString() || "N/A"}</p>
                    <p>Deleted: {order.deleted ? "Yes" : "No"}</p>
                    <input
                        type="text"
                        placeholder="Enter PayPal ID"
                        value={paypalId}
                        onChange={(e) => setPaypalId(e.target.value)}
                        className="mb-2 p-2 border rounded w-full"
                    />
                    <Button
                        size="sm"
                        onClick={() => handleCommit(new OrderId(UInt64.from(orderId)), "exampleSenderId")}
                        loading={loading}
                    >
                        Commit to Order
                    </Button>
                    <input
                        type="file"
                        accept=".eml"
                        onChange={(e) => handleUpload(e, order)}
                        className="mt-2"
                    />
                    <Button
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleRemove(new OrderId(UInt64.from(orderId)))}
                    >
                        Close
                    </Button>
                </div>
            ))}

            {/* {wallet && (
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

                                // Simulate committing the order after payment is approved
                                if (client && wallet && selectedOrder) {
                                    const toAddress = new PublicKey(wallet);
                                    await handleCommit(client, selectedOrder.id, PublicKey.fromBase58(wallet));
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
            )} */}

        </Card>
    )
}

// export function CommitOrder(props: CommitOrderProps) {
//     const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;
//     const currency_code = "USD";

//     return (
//         <PayPalScriptProvider options={{ clientId: paypalClientId, currency: currency_code, intent: 'capture' }}>
//             {/* <CommitOrderInternal {...props} /> */}
//         </PayPalScriptProvider>
//     );
// }