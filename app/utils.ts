import signed from "signed";

const signingKey = process.env["SIGNING_KEY"];
if (!signingKey) {
  throw new Error("SIGNING_KEY is required");
}

const signature = signed({ secret: signingKey });

export function signUrl(url: string): string {
  console.log("SIGNING", url);
  return signature.sign(url);
}

export function verifySignedUrl(url: string, forceVerify?: boolean): string {
  console.log("VERIFYING", url);
  // TODO - find a fix for this
  if (forceVerify) {
    return signature.verify(url);
  }
  return url;
  // return signature.verify(url);
}
