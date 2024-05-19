import { Bytes } from "o1js";
import { Bigint2048 } from "o1js-rsa";
import { verifyDKIMSignature } from "@zk-email/helpers/dist/dkim/index.js";
import { Hash, Provable } from "o1js";

type EmailVerifyInputs = {
  headers: Bytes;
  signature: Bigint2048;
  publicKey: Bigint2048;
  modulusLength: number;
  headerBodyHash: Bytes;
  body: Bytes;
  parsedData: ParsedEmailInputs;
};

export async function generateInputs(
  rawEmail: string,
): Promise<EmailVerifyInputs> {
  const dkimResult = await verifyDKIMSignature(Buffer.from(rawEmail));
  console.log("DKIM result:", dkimResult);

  // Extract components from DKIM result
  const headers = Bytes.from(dkimResult.headers);
  const signature = Bigint2048.from(dkimResult.signature);
  const publicKey = Bigint2048.from(dkimResult.publicKey);

  const modulusLength = dkimResult.modulusLength;

  const headerBodyHash = Bytes.fromString(dkimResult.bodyHash);
  const body = Bytes.from(new Uint8Array(dkimResult.body));

  const parsedData = await parseEmail(rawEmail);

  return {
    headers,
    signature,
    publicKey,
    modulusLength,
    headerBodyHash,
    body,
    parsedData,
  };
}

interface ParsedEmailInputs {
  paypalAccountId: string;
  usdAmount: string;
  transactionId: string;
}

async function parseEmail(rawEmail: string): Promise<ParsedEmailInputs> {
  const paypalIdPattern = /From:\s*"(.*?)"\s*<servicio@paypal\.es>/;
  const usdAmountPattern = /([0-9,]+(\.[0-9]{2})?)\s*[A-Z]{3}/;
  const transactionIdPattern = /(\b[0-9A-Z]{17}\b)/;

  const paypalIdMatch = rawEmail.match(paypalIdPattern);
  const usdAmountMatch = rawEmail.match(usdAmountPattern);
  const transactionIdMatch = rawEmail.match(transactionIdPattern);

  if (!paypalIdMatch || !usdAmountMatch || !transactionIdMatch) {
    throw new Error("Failed to parse email content");
  }

  const paypalAccountId = paypalIdMatch[1];
  const usdAmount = usdAmountMatch[1];
  const transactionId = transactionIdMatch[1];

  return {
    paypalAccountId,
    usdAmount,
    transactionId,
  };
}
