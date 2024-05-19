import { Bigint2048, rsaVerify65537 } from "o1js-rsa";
import { Hash, Bytes, Provable } from "o1js";
import { base64Decode } from "o1js-base64";

export { emailVerify };

/**
 * Verifies a DKIM signature using the provided message, signature, and public key.
 *
 * @param headers - The message to be verified, represented as a Bytes object.
 * @param signature - The signature to be verified.
 * @param publicKey - The public key used for verification.
 * @param modulusLength - The length of the modulus.
 * @param bodyHashCheck - Indicates whether to check the body hash.
 * @param headerBodyHash - The hash of the header and body.
 * @param body - The body of the email.
 */
function emailVerify(
  headers: Bytes,
  signature: Bigint2048,
  publicKey: Bigint2048,
  modulusLength: number,
  bodyHashCheck: boolean,
  headerBodyHash: Bytes,
  body: Bytes,
) {
  // 1. Verify the DKIM signature
  const hash = Hash.SHA2_256.hash(headers); // Hash the preimage using o1js
  const paddedHash = pkcs1v15Pad(hash, Math.ceil(modulusLength / 8)); // PKCS#1 v1.5 encode the hash

  // Create message for verification
  const message = Provable.witness(Bigint2048, () => {
    const hexString = "0x" + paddedHash.toHex();
    return Bigint2048.from(BigInt(hexString));
  });

  // Verify RSA65537 signature
  rsaVerify65537(message, signature, publicKey);

  // 2. Check body hash
  if (bodyHashCheck) {
    // Decode base64-encoded body hash
    const decodedB64 = base64Decode(headerBodyHash, 32);

    // Hash body
    const hashedBody = Hash.SHA2_256.hash(body);
    Provable.assertEqual(decodedB64, hashedBody);
  }
}

/**
 * Creates a PKCS#1 v1.5 padded signature for the given SHA-256 digest.
 *
 * @note This function follows the RFC3447 standard: https://datatracker.ietf.org/doc/html/rfc3447#section-9.2
 *
 * @param sha256Digest The SHA-256 digest to be padded.
 * @param modulusLength The size of the RSA modulus in bytes.
 * @returns The padded PKCS#1 v1.5 signature.
 */
function pkcs1v15Pad(sha256Digest: Bytes, modulusLength: number): Bytes {
  // Parse the PKCS#1 v1.5 algorithm constant
  const algorithmConstantBytes = Bytes.fromHex(
    "3031300d060960864801650304020105000420",
  ).bytes;

  // Calculate the length of the padding string (PS)
  const padLength =
    modulusLength - sha256Digest.length - algorithmConstantBytes.length - 3;

  // Create the padding string (PS) with 0xFF bytes based on padLength
  const paddingString = Bytes.from(new Array(padLength).fill(0xff));

  // Assemble the PKCS#1 v1.5 padding components
  const padding = [
    ...Bytes.fromHex("0001").bytes, // Block type (BT)
    ...paddingString.bytes, // Padding string (PS)
    ...Bytes.fromHex("00").bytes, // Separator (00)
    ...algorithmConstantBytes, // Algorithm identifier (OID)
    ...sha256Digest.bytes, // SHA-256 digest
  ];

  // Return the padded PKCS#1 v1.5 signature
  return Bytes.from(padding);
}
