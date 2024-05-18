"use client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FormControl, FormField, FormItem, FormLabel } from "./ui/form";
import { useForm, SubmitHandler, FormProvider } from "react-hook-form";
import { Button } from "./ui/button";
import { useClientStore } from "@/lib/stores/client";
import { useOrdersStore } from "@/lib/stores/orders";
import { PublicKey, UInt64, CircuitString, Field } from "o1js";
import { CreateOrder, OrderId } from "chain/dist/order"
import { TokenId, Balance } from "@proto-kit/library";

export interface OrderProps {
    wallet?: string;
    loading: boolean;
    onConnectWallet: () => void;
    setLoading: (loading: boolean) => void;
}

interface OrderFormInputs {
    paypalAccountId: string;
    walletAddress: string;
    amount: string;
    price: string;
}

export function Order({
    wallet,
    loading,
    setLoading,
}: OrderProps) {
    const methods = useForm<OrderFormInputs>();
    const client = useClientStore((state) => state.client);
    const publishOrder = useOrdersStore((state) => state.publishOrder);

    const onSubmit: SubmitHandler<OrderFormInputs> = async (data) => {
        const { paypalAccountId, amount, price } = data;

        console.log("paypalAccountId, amount, price = ", paypalAccountId, " ", amount, " ", price)
        setLoading(true);
        try {
            if (client && wallet) {
                const randomBigInt = BigInt.asUintN(64, BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)));
                const validUntil = UInt64.from(1000);
                const tokenId = TokenId.from(0);
                const amountToken = UInt64.from(parseFloat(amount));
                const amountUsd = UInt64.from(parseFloat(price) * 100);
                const usdReceiverIdHash = CircuitString.fromString(paypalAccountId).hash();
                const order = new CreateOrder({
                    order_id: new OrderId(UInt64.from(randomBigInt)),
                    valid_until: validUntil,
                    token_id: tokenId,
                    amount_token: new Balance(amountToken),
                    amount_usd: amountUsd,
                    usd_receiver_id_hash: Field.from(usdReceiverIdHash),
                });
                await publishOrder(
                    client,
                    PublicKey.fromBase58(wallet),
                    order,
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full p-4">
            <div className="mb-2">
                <h2 className="text-xl font-bold">Create Order</h2>
                <p className="mt-1 text-sm text-zinc-500">
                    Create Order to onramp (L2) MINA
                </p>
            </div>
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(onSubmit)}>
                    <div className="pt-3">
                        <FormField
                            name="paypal-id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        To{" "}
                                        <span className="text-sm text-zinc-500">(your paypal account)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder={"S8DJ8UERWDTLS"}
                                            {...methods.register("paypalAccountId", { required: true })}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="to"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Wallet Address{" "}
                                        <span className="text-sm text-zinc-500">(your wallet)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            disabled
                                            placeholder={wallet ?? "Please connect a wallet first"}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Amount{" "}
                                        <span className="text-sm text-zinc-500">(MINA)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="100"
                                            {...methods.register("amount", { required: true })}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            name="price"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>
                                        Price{" "}
                                        <span className="text-sm text-zinc-500">($)</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="50"
                                            {...methods.register("price", { required: true })}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>

                    <Button
                        size={"lg"}
                        type="submit"
                        className="mt-6 w-full"
                        loading={loading}
                    // onClick={() => {
                    //     wallet ?? onConnectWallet();
                    //     wallet && handleSubmit();
                    // }}
                    >
                        {wallet ? "Create Order" : "Connect wallet"}
                    </Button>
                </form>
            </FormProvider>
        </Card>
    );
}
