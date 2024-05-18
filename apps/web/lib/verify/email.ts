import { Bytes } from "o1js";
import { Bigint2048 } from "o1js-rsa";
import { verifyDKIMSignature } from "@zk-email/helpers/dist/dkim/index.js";

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
  // Add other fields as needed
}

async function parseEmail(rawEmail: string): Promise<ParsedEmailInputs> {
  // Define regex patterns
  const paypalIdPattern = /PayPal Account ID:\s*(\S+)/;
  const usdAmountPattern = /Amount:\s*\$([0-9]+\.[0-9]{2})/;

  // Match patterns
  const paypalIdMatch = rawEmail.match(paypalIdPattern);
  const usdAmountMatch = rawEmail.match(usdAmountPattern);

  if (!paypalIdMatch || !usdAmountMatch) {
    throw new Error("Failed to parse email content");
  }

  const paypalAccountId = paypalIdMatch[1];
  const usdAmount = usdAmountMatch[1];

  return {
    paypalAccountId,
    usdAmount,
  };
}
