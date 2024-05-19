import { assert } from "@proto-kit/protocol";
import { Bool, CircuitString, Field, Struct, VerificationKey } from "o1js";
import { OrderId } from "./order";
import { ProveExternalUsdTx  } from "proofs/dist/index.js"

export async function compileZkProgram() : Promise<{verificationKey: VerificationKey}> {
  return await ProveExternalUsdTx.compile();
}

export class PaypalIdHash extends Struct({
  value: Field,
}) {
  public static fromStringPaypalId(value: string): PaypalIdHash {
    return new PaypalIdHash({ value: CircuitString.fromString(value).hash() });
  }
}
export class PaypalTxPublicData extends Struct({
  orderId: OrderId,
  usdTxProofDataHash: Field,
  shouldVerify: Bool, // -- remove :)
}) {}

// TODO: use actual proof
export class PaypalTxProof extends Struct({
  publicInput: PaypalTxPublicData,
}) {
  public mockVerify() {
    assert(Bool(this.publicInput.shouldVerify), "Proof verification failed");
  }
}

export function DummyValidProof(orderId: OrderId): PaypalTxProof {
  const usdTxProofDataHash = Field.from(0);
  return new PaypalTxProof({
    publicInput: new PaypalTxPublicData({ orderId, usdTxProofDataHash, shouldVerify: Bool(true) }),
  });
}

export function DummyInvalidProof(orderId: OrderId): PaypalTxProof {
  const usdTxProofDataHash = Field.from(0);
  return new PaypalTxProof({
    publicInput: new PaypalTxPublicData({ orderId, usdTxProofDataHash, shouldVerify: Bool(false) }),
  });
}
