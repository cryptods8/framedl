import signed from "signed";

const signingKey = process.env["SIGNING_KEY"];
if (!signingKey) {
  throw new Error("SIGNING_KEY is required");
}

const signature = signed({ secret: signingKey });

export function signUrl(url: string): string {
  return signature.sign(url);
}

export function verifySignedUrl(url: string): string {
  return signature.verify(url);
}
