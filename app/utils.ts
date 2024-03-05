import signed from "signed";
import { headers } from "next/headers";

export function currentURL(pathname: string): URL {
  const headersList = headers();
  const host = headersList.get("x-forwarded-host") || headersList.get("host");
  const protocol = headersList.get("x-forwarded-proto") || "http";

  return new URL(pathname, `${protocol}://${host}`);
}

const signingKey = process.env["SIGNING_KEY"];
if (!signingKey) {
  throw new Error("SIGNING_KEY is required");
}

const signature = signed({ secret: signingKey });

export function signUrl(url: string): string {
  // console.log("SIGNING", url);
  return signature.sign(url);
}

export function verifySignedUrl(url: string): string {
  // console.log("VERIFYING", url);
  return signature.verify(url);
}

export async function timeCall<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const result = await fn();
  console.log(`Time for ${name}: ${Date.now() - start}ms`);
  return result;
}
