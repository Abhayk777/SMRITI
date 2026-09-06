const encoder = new TextEncoder();

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function verifyHmacSha1(
  secret: string,
  payload: string,
  signature: Uint8Array | null,
): Promise<boolean> {
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(payload));
}

export async function validateTwilioSignature(
  authToken: string,
  signature: string | null,
  fullUrl: string,
  formBody: URLSearchParams,
): Promise<boolean> {
  if (!signature) return false;
  const sorted = [...formBody.entries()].sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  ));
  const payload = sorted.reduce(
    (value, [key, fieldValue]) => `${value}${key}${fieldValue}`,
    fullUrl,
  );
  return verifyHmacSha1(authToken, payload, decodeBase64(signature));
}

export async function validateVapiSignature(
  webhookSecret: string,
  providedSecret: string | null,
): Promise<boolean> {
  return secretsEqual(webhookSecret, providedSecret);
}

export async function secretsEqual(left: string, right: string | null): Promise<boolean> {
  if (!right) return false;
  const [leftDigest, rightDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftDigest);
  const rightBytes = new Uint8Array(rightDigest);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}
