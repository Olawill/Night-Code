// import {createClerkClient} from "@clerk/backend"
import { oauthProvider } from "@better-auth/oauth-provider";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { verifyAccessToken } from "better-auth/oauth2";
import { jwt } from "better-auth/plugins";

if (!process.env.BETTER_AUTH_SECRET) {
  throw new Error("BETTER_AUTH_SECRET environment variable is required");
}

if (!process.env.BETTER_AUTH_URL) {
  throw new Error("BETTER_AUTH_URL environment variable is required");
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

const db = {
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

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
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

// Create the CLI client at startup
// const apiUrl = process.env.API_URL ?? "http://localhost:3000";

// const cliClient = await auth.api.adminCreateOAuthClient({
//   headers: new Headers(),
//   body: {
//     client_name: "Nightcode CLI",
//     redirect_uris: [`${apiUrl}/auth/callback`],
//     token_endpoint_auth_method: "none",
//     skip_consent: true,
//   },
// });

// console.log("CLI client created:", cliClient.clientId);
// console.log(
//   "Add to your .env: BETTER_AUTH_CLI_CLIENT_ID=" + cliClient.clientId,
// );

export const authenticateOAuthRequest = async (request: Request) => {
  const authorization = request.headers.get("authorization") ?? undefined;
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }
  const accessToken = authorization.slice(7); // "Bearer ".length === 7

  if (!accessToken) return null;

  try {
    const payload = await verifyAccessToken(accessToken, {
      verifyOptions: {
        issuer: process.env.BETTER_AUTH_URL!,
        audience: process.env.API_URL ?? "http://localhost:3000",
      },
    });
    if (!payload?.sub) return null;
    return { userId: payload.sub };
  } catch {
    return null;
  }
};
