import { Message } from "@farcaster/core";
import { decodeAbiParameters } from "viem";

import { hubHttpUrl } from "./constants";
import { FrameActionPayload } from "frames.js";

const signedKeyRequestAbi = [
  {
    components: [
      {
        name: "requestFid",
        type: "uint256",
      },
      {
        name: "requestSigner",
        type: "address",
      },
      {
        name: "signature",
        type: "bytes",
      },
      {
        name: "deadline",
        type: "uint256",
      },
    ],
    name: "SignedKeyRequest",
    type: "tuple",
  },
] as const;

interface OnChainSignerResponse {
  signerEventBody?: {
    metadata: string;
  };
}

export type ClientType =
  | "NEYNAR"
  | "WARPCAST"
  | "FLINK"
  | "MOD"
  | "SUPERCAST"
  | "OTHER";

const clientTypeByFid: Record<number, ClientType> = {
  6131: "NEYNAR",
  9152: "WARPCAST",
  19150: "FLINK",
  20770: "MOD",
  193137: "SUPERCAST",
};

export async function getClientType(
  frameActionPayload: FrameActionPayload
): Promise<ClientType | null> {
  const message = Message.decode(
    Buffer.from(frameActionPayload.trustedData.messageBytes, "hex")
  );
  try {
    const signer = Buffer.from(message.signer).toString("hex");
    const fid = message.data?.fid;
    if (!fid) {
      return null;
    }
    const onChainSignersResponse = await fetch(
      `${hubHttpUrl}/v1/onChainSignersByFid?fid=${fid}&signer=0x${signer}`,
      {
        method: "GET",
        headers: {
          api_key: "NEYNAR_FRAMES_JS",
        },
      }
    );
    const onChainSigners =
      (await onChainSignersResponse.json()) as OnChainSignerResponse | null;
    const metadata = onChainSigners?.signerEventBody?.metadata;
    if (!metadata) {
      console.log("no metadata found", onChainSigners);
      return null;
    }
    const metadataHex = Buffer.from(
      Uint8Array.from(atob(metadata), (c) => c.charCodeAt(0))
    ).toString("hex");
    const metadataParams = decodeAbiParameters(
      signedKeyRequestAbi,
      `0x${metadataHex}`
    );
    const clientFid = Number(metadataParams[0].requestFid);
    return clientTypeByFid[clientFid] || "OTHER";
  } catch (e) {
    console.error("Error getting client type", e);
    return null;
  }
}
