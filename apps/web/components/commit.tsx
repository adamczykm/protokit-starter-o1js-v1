"use client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useClientStore } from "@/lib/stores/client";
import { useOrdersStore } from "@/lib/stores/orders";
import { useEffect, useState } from "react";
import { PublicKey, CircuitString, Field, UInt64, Bool } from "o1js";
import { Order, OrderId } from "chain/dist/order"
import { PaypalTxProof } from "chain/dist/paypal"
import { computeProofDataHash, generatePublicInput } from "@/lib/verify/proof"

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

    const {
        orders,
        getOrders,
        commitOrder,
        closeOrder,
        proofOrder
    } = useOrdersStore((state) => ({
        orders: state.orders,
        getOrders: state.getOrders,
        commitOrder: state.commitOrder,
        closeOrder: state.closeOrder,
        proofOrder: state.proofOrder
    }));
    const [paypalId, setPaypalId] = useState<string>("");
    const [emailContent, setEmailContent] = useState('');

    useEffect(() => {
        const fetchOrders = async () => {
            if (client) {
                await getOrders(client);
            }
        };
        fetchOrders();
    }, [client, getOrders, commitOrder, closeOrder]);

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

    const handleUpload = async (event: any) => {
        const file = event.target.files[0];
        setLoading(true);
        try {
            if (file && client) {
                const emailContent = await file.text();
                setEmailContent(emailContent);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitProof = async (orderId: OrderId, order: Order) => {
        if (!client || !wallet) {
            return
        }
        try {
            const proofDataHash = computeProofDataHash(
                order.amount_usd,
                order.usd_receiver_id_hash,
                paypalId,
                new PublicKey(wallet)
            );

            const publicInput = generatePublicInput(orderId, proofDataHash);
            const proof = new PaypalTxProof({ publicInput });

            await proofOrder(client, proof, orderId, PublicKey.fromBase58(wallet));
            alert('Proof submitted successfully!');
        } catch (error) {
            console.error('Error submitting proof:', error);
        }
    }

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

    return (
        <Card className="w-full p-2">
            <div className="mb-2 p-2 bg-blue-100">
                <h2 className="text-xl font-bold">Commit to Orders</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    Browse and commit to orders, then upload PayPal email for verification.
                </p>
            </div>

            <div className="max-h-80 overflow-y-auto">
                {Array.from(orders.entries()).map(([orderId, order]) => {
                    const isDeleted = Bool.fromValue(order.deleted).toBoolean();
                    return (<div key={orderId.toString()} className={`mb-4 border-b pb-4 ${isDeleted ? 'bg-gray-200' : ''}`}>
                        <h3 className="font-semibold text-lg mb-2">Order #{orderId.toString()}</h3>
                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>Amount: {order.amount_token.toString()} MINA</div>
                            <div>Price: {order.amount_usd.toString()} $</div>
                            <div>Valid Until: {order.valid_until.toString()}</div>
                            <div>Locked: {order.locked_until?.toString() || "N/A"}</div>
                            <div>Deleted: {(Bool.fromValue(order.deleted)).toBoolean() ? "Y" : "N"}</div>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter PayPal ID"
                            value={paypalId}
                            onChange={(e) => setPaypalId(e.target.value)}
                            className="mb-2 p-2 border rounded w-full"
                        />
                        <div className="flex items-center mb-2">
                            <Button
                                size="sm"
                                onClick={() => handleCommit(new OrderId(UInt64.from(orderId)), "exampleSenderId")}
                                loading={loading}
                            >
                                Commit to Order
                            </Button>
                            <Button
                                className="text-red-500 hover:text-red-700 ml-4"
                                onClick={() => handleRemove(new OrderId(UInt64.from(orderId)))}
                                loading={loading}
                            >
                                Close
                            </Button>
                            <input
                                type="file"
                                accept=".eml"
                                onChange={(e) => handleUpload(e)}
                                className="mt-2 ml-10"
                            />
                        </div>
                    </div>
                    );
                })}
            </div>

        </Card>
    )
}
