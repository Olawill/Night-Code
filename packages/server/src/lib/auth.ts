// import {createClerkClient} from "@clerk/backend"
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
// import { verifyAccessToken } from "better-auth/oauth2";
import { jwt } from "better-auth/plugins";
import { homedir } from "node:os";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required");
}

if (!process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL environment variable is required");
}

const AUTH_DIR = join(homedir(), ".nightcode");
const DB_FILE = join(AUTH_DIR, "db.json");

if (!existsSync(AUTH_DIR)) {
  mkdirSync(AUTH_DIR, { mode: 0o700 });
}

// const clerkClient = createClerkClient({
//   secretKey: process.env.CLERK_SECRET_KEY,
//   publishableKey: process.env.CLERK_PUBLISHABLE_KEY
// })

// export const authenticateOAuthRequest = async (request: Request) => {
//   const requestState = await clerkClient.authenticateRequest(request, {
//     acceptsToken: "oauth-token"
//   })

//   if (!requestState.isAuthenticated) {
//     return null;
//   }

//   const auth = requestState.toAuth();
//   if (auth.tokenType !== "oauth-token" || !auth.userId) {
//     return null
//   }

//   return { userId: auth.userId}
// }

type JWK = {
  kid: string;
  alg: string;
  kty: string;
  crv?: string;
  x?: string;
  n?: string;
  e?: string;
  use?: string;
};

let cachedJwks: { keys: JWK[] } | null = null;

const defaultDb = {
  user: [],
  session: [],
  account: [],
  verification: [],
  oauthClient: [],
  oauthAccessToken: [],
  oauthRefreshToken: [],
  oauthConsent: [],
  jwks: [],
};

const db: Record<string, any[]> = existsSync(DB_FILE)
  ? JSON.parse(readFileSync(DB_FILE, "utf-8"))
  : { ...defaultDb };

for (const key of Object.keys(defaultDb)) {
  if (!db[key]) db[key] = [];
}

const persistDb = () =>
  writeFileSync(DB_FILE, JSON.stringify(db), { mode: 0o600 });

setInterval(persistDb, 10_000);
process.on("SIGINT", () => {
  persistDb();
  process.exit(0);
});
process.on("SIGTERM", () => {
  persistDb();
  process.exit(0);
});

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  basePath: "/api/auth",
  database: memoryAdapter(db),
  emailAndPassword: {
    enabled: true, // ← this was missing
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  disabledPaths: ["/token"],
  plugins: [
    jwt(),
    oauthProvider({
      loginPage: "/sign-in",
      consentPage: "/consent",
      scopes: ["openid", "email", "profile"],
      validAudiences: [process.env.API_URL ?? "http://localhost:3000"],
      allowDynamicClientRegistration: true,
      allowUnauthenticatedClientRegistration: true,
      allowPublicClientPrelogin: true,
    }),
  ],
});

export const authenticateOAuthRequest = async (request: Request) => {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const accessToken = authorization.slice(7); // "Bearer ".length === 7

  if (!accessToken) return null;

  // Must be a jWT (has dots)
  const parts = accessToken.split(".");
  if (parts.length !== 3) return null;

  try {
    if (!cachedJwks) {
      // Fetch JWKS from the local server
      const jwksRes = await fetch(
        `${process.env.BETTER_AUTH_URL}/api/auth/jwks`,
      );

      if (!jwksRes.ok) {
        console.error("JWKS fetch failed:", jwksRes.status);
      }
      cachedJwks = (await jwksRes.json()) as { keys: JWK[] };
    }

    const [headerB64, payloadB64, signatureB64] = parts as [
      string,
      string,
      string,
    ];

    // Decode header to find the right key
    const header = JSON.parse(
      Buffer.from(headerB64, "base64url").toString(),
    ) as { kid: string; alg: string };

    let jwk = cachedJwks.keys.find((k) => k.kid === header.kid);
    if (!jwk) {
      // JWKS may have rotated — clear cache and refetch once
      cachedJwks = null;
      const jwksRes = await fetch(
        `${process.env.BETTER_AUTH_URL}/api/auth/jwks`,
      );
      if (!jwksRes.ok) return null;
      cachedJwks = (await jwksRes.json()) as { keys: JWK[] };
      jwk = cachedJwks.keys.find((k) => k.kid === header.kid);
      if (!jwk) {
        console.error("No matching key found for kid:", header.kid);
        return null;
      }
    }

    // Import the public key
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    // Verify signature
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = new Uint8Array(Buffer.from(signatureB64, "base64url"));
    const valid = await crypto.subtle.verify(
      "Ed25519",
      publicKey,
      signature,
      data,
    );

    if (!valid) {
      console.error("Invalid signature");
      return null;
    }

    // Decode and validate payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString(),
    ) as { sub: string; exp: number; iss: string };

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      console.error("Token expired");
      return null;
    }

    // Check issuer
    if (payload.iss !== `${process.env.BETTER_AUTH_URL}/api/auth`) {
      console.error("Invalid issuer:", payload.iss);
      return null;
    }

    if (!payload?.sub) return null;
    return { userId: payload.sub };
  } catch (err) {
    console.error("Token verification failed:", err);
    return null;
  }
};
