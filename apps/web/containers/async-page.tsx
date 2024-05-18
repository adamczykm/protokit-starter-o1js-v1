"use client";
import { useState } from "react";
import { Order } from "@/components/order";
import { CommitOrderInternal } from "@/components/commit";
import { useWalletStore } from "@/lib/stores/wallet";

export default function Home() {
    const wallet = useWalletStore();
    const [selectedTab, setSelectedTab] = useState<'order' | 'commit'>('order');
    const [orderLoading, setOrderLoading] = useState(false);
    const [commitLoading, setCommitLoading] = useState(false);

    const renderContent = () => {
        if (selectedTab === 'order') {
            return (
                <Order
                    wallet={wallet.wallet}
                    onConnectWallet={wallet.connectWallet}
                    loading={orderLoading}
                    setLoading={setOrderLoading}
                />
            );
        } else {
            return (
                <CommitOrderInternal
                    wallet={wallet.wallet}
                    onConnectWallet={wallet.connectWallet}
                    loading={commitLoading}
                    setLoading={setCommitLoading}
                />
            );
        }
    };

    return (
        <div className="mx-auto -mt-32 h-full pt-16">
            <div className="flex h-full w-full items-center justify-center pt-16">
                <div className="flex flex-col items-center justify-center w-full max-w-3xl">
                    <div className="fix space-x-4 mb-8">
                        <button
                            onClick={() => setSelectedTab('order')}
                            className={`px-4 py-2 ${selectedTab === 'order' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            Order
                        </button>
                        <button
                            onClick={() => setSelectedTab('commit')}
                            className={`px-4 py-2 ${selectedTab === 'commit' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                        >
                            Commit Order
                        </button>
                    </div>
                    <div className="w-full flex-grow">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}
