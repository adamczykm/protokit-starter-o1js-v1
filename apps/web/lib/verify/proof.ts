import { CircuitString, Field, PublicKey, Bool, UInt64 } from "o1js";
import { OrderId } from "chain/dist/order";
import { OrderLock } from "chain/dist/order-lock";
import { UsdTxProofData } from "chain/dist/usd-tx";
import { PaypalTxPublicData } from "chain/dist/paypal";
import { ProveExternalUsdTx } from "proofs/dist/index.js";

export async function compileZkProgram() {
  const { verificationKey } = await ProveExternalUsdTx.compile();
  console.log("ZK Program compiled with verification key:", verificationKey);
}

export const computeProofDataHash = (
  usdAmount: UInt64,
  usdReceiverIdHash: Field,
  usdSenderId: string,
  senderPublicKey: PublicKey,
) => {
  const usdSenderIdHash = CircuitString.fromString(usdSenderId).hash();
  const lockData = OrderLock.create({
    usd_sender_id_hash: usdSenderIdHash,
    sender_public_key: senderPublicKey,
  }).lock;

  const proofData = new UsdTxProofData({
    usd_amount: new UInt64(usdAmount),
    usd_receiver_id_hash: usdReceiverIdHash,
    lock_data: lockData,
  });

  return proofData.hash();
};
