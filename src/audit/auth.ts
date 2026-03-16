/**
 * Google API authentication using self-signed JWT (jose)
 * Generates JWTs directly usable as Bearer tokens for Google APIs
 */
import { importPKCS8, SignJWT } from "jose";
import { readFileSync } from "fs";
import type { ServiceAccountKey } from "./types.js";

const TOKEN_LIFETIME_SEC = 3600;

interface CachedJWT {
  token: string;
  expiresAt: number;
}

const jwtCache = new Map<string, CachedJWT>();

function loadServiceAccountKey(): ServiceAccountKey {
  const envKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (envKey) {
    return JSON.parse(envKey) as ServiceAccountKey;
  }

  const envPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  if (envPath) {
    return JSON.parse(readFileSync(envPath, "utf-8")) as ServiceAccountKey;
  }

  throw new Error(
    "Set GOOGLE_SERVICE_ACCOUNT_KEY (JSON string) or GOOGLE_SERVICE_ACCOUNT_KEY_PATH",
  );
}

let cachedKey: ServiceAccountKey | null = null;
let cachedPrivateKey: CryptoKey | null = null;

async function getSigningKey(): Promise<{ sa: ServiceAccountKey; pk: CryptoKey }> {
  if (cachedKey && cachedPrivateKey) {
    return { sa: cachedKey, pk: cachedPrivateKey };
  }
  cachedKey = loadServiceAccountKey();
  cachedPrivateKey = await importPKCS8(cachedKey.private_key, "RS256") as CryptoKey;
  return { sa: cachedKey, pk: cachedPrivateKey };
}

/**
 * Get a self-signed JWT for a specific Google API audience.
 * The JWT is used directly as a Bearer token (no token exchange needed).
 */
export async function getAccessToken(audience: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  const cached = jwtCache.get(audience);
  if (cached && cached.expiresAt > now + 60) {
    return cached.token;
  }

  const { sa, pk } = await getSigningKey();

  const jwt = await new SignJWT({
    iss: sa.client_email,
    sub: sa.client_email,
    aud: audience,
    iat: now,
    exp: now + TOKEN_LIFETIME_SEC,
  })
    .setProtectedHeader({ alg: "RS256" })
    .sign(pk);

  jwtCache.set(audience, {
    token: jwt,
    expiresAt: now + TOKEN_LIFETIME_SEC,
  });

  return jwt;
}

// API audience constants
export const GA4_AUDIENCE = "https://analyticsdata.googleapis.com/";
export const GSC_AUDIENCE = "https://searchconsole.googleapis.com/";
