export const isProduction = process.env["VERCEL_ENV"] === "production";
const fallbackBaseUrl = isProduction
  ? "https://framedl.vercel.app"
  : "http://localhost:3000";

export const baseUrl =
  process.env["NEXT_PUBLIC_HOST"] ||
  process.env["BASE_URL"] ||
  process.env["VERCEL_URL"] ||
  fallbackBaseUrl;

const fallbackHubHttpUrl = isProduction
  ? undefined
  : "https://api.neynar.com:2281";
// : "http://localhost:3000/debug/hub";

export const hubHttpUrl =
  process.env["FRAME_HUB_HTTP_URL"] || fallbackHubHttpUrl;
