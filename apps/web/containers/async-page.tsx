"use client";
import { useState } from "react";
import { Order } from "@/components/order";
import { CommitOrder } from "@/components/commit";
import { useWalletStore } from "@/lib/stores/wallet";

export default function Home() {
    const wallet = useWalletStore();

    const [orderLoading, setOrderLoading] = useState(false);
    const [commitLoading, setCommitLoading] = useState(false);

    return (
        <div className="mx-auto -mt-32 h-full pt-16">
            <div className="flex h-full w-full items-center justify-center pt-16">
                <div className="flex basis-4/12 flex-col items-center justify-center 2xl:basis-3/12">
                    <Order
                        wallet={wallet.wallet}
                        onConnectWallet={wallet.connectWallet}
                        loading={orderLoading}
                        setLoading={setOrderLoading}
                    />
                </div>
                <div className="flex basis-4/12 flex-col items-center justify-center 2xl:basis-3/12">
                    <CommitOrder
                        wallet={wallet.wallet}
                        onConnectWallet={wallet.connectWallet}
                        loading={commitLoading}
                        setLoading={setCommitLoading}
                    />
                </div>
            </div>
        </div>
    );
}
