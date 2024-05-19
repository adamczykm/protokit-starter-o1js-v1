import { Struct, Field, ZkProgram, CircuitString, UInt64, Poseidon, PrivateKey, PublicKey, Signature } from 'o1js';

export class UsdTxPublicData extends Struct({
  orderId: UInt64,
}) {}

export class UsdTxReferenceHash extends Struct({
  usdTxProofDataHash: Field
}) {}


export class PaypalTxPrivateData extends Struct({
  rawEml: CircuitString,
}) {}

export class FakeProofPrivateData extends Struct({
  usd_amount: UInt64,
  usd_receiver_id_hash: Field,
  usd_sender_id_hash: Field,
  sender_public_key: PublicKey, // TODO: temporary -> use signatures
  sender_signature: Signature
}) {}


export function buildPublicReferenceData(p: FakeProofPrivateData) {
  const sender_public_key = p.sender_public_key
  const lock = Poseidon.hash([p.usd_sender_id_hash, ...sender_public_key.toFields()]);
  const ret =  Poseidon.hash([
    p.usd_amount.value,
    p.usd_receiver_id_hash,
    lock
  ]);
  return ret
}

export const ProveExternalUsdTx = ZkProgram({
  name: 'ProveExternalUsdTx',
  publicInput: UsdTxPublicData,
  publicOutput: UsdTxReferenceHash,
  methods: {
    fakeProof: {
      privateInputs: [FakeProofPrivateData],
      async method(_publicInput: UsdTxPublicData, secretInput: FakeProofPrivateData) {
        const ref = buildPublicReferenceData(secretInput)
        secretInput.sender_signature.verify(secretInput.sender_public_key,[ref])
        return new UsdTxReferenceHash({
          usdTxProofDataHash: ref
        })
      }
    },
    baseCase: {
      privateInputs: [PaypalTxPrivateData],
      async method(_publicInput: UsdTxPublicData, _secretInput: PaypalTxPrivateData) {
        return new UsdTxReferenceHash({
          usdTxProofDataHash: Field(0)
        })
      }
    }
  }
});

export class ExternalUsdTxProof extends ZkProgram.Proof(ProveExternalUsdTx) {}
