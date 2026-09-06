import crypto from "node:crypto";
import { getFirebaseAdminDb } from "./firebaseAdmin";

const STATE_TTL_MS = 10 * 60 * 1000;

function requireEncryptionKey() {
  const value = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!value) {
    throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY is not configured.");
  }
  return crypto.createHash("sha256").update(value).digest();
}

function signState(payload: string) {
  const secret = process.env.GITHUB_OAUTH_STATE_SECRET;
  if (!secret) throw new Error("GITHUB_OAUTH_STATE_SECRET is not configured.");
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

export function createGitHubOAuthState(args: {
  projectId: string;
  uid: string;
}) {
  const payload = Buffer.from(
    JSON.stringify({
      projectId: args.projectId,
      uid: args.uid,
      expiresAt: Date.now() + STATE_TTL_MS,
    }),
  ).toString("base64url");
  return `${payload}.${signState(payload)}`;
}

export function verifyGitHubOAuthState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Malformed GitHub OAuth state.");

  const expected = signState(payload);
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    throw new Error("Invalid GitHub OAuth state signature.");
  }

  const parsed = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf8"),
  ) as {
    projectId: string;
    uid: string;
    expiresAt: number;
  };
  if (!parsed.projectId || !parsed.uid || parsed.expiresAt < Date.now()) {
    throw new Error("Expired GitHub OAuth state.");
  }
  return parsed;
}

export function encryptGitHubToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    requireEncryptionKey(),
    iv,
  );
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return {
    ciphertext: encrypted.toString("base64url"),
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
  };
}

export function decryptGitHubToken(value: {
  ciphertext: string;
  iv: string;
  tag: string;
}) {
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    requireEncryptionKey(),
    Buffer.from(value.iv, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(value.tag, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function saveGitHubConnection(args: {
  projectId: string;
  uid: string;
  accessToken: string;
  githubLogin?: string;
}) {
  const encryptedToken = encryptGitHubToken(args.accessToken);
  await getFirebaseAdminDb()
    .collection("githubConnections")
    .doc(args.projectId)
    .set({
      projectId: args.projectId,
      connectedBy: args.uid,
      githubLogin: args.githubLogin || null,
      token: encryptedToken,
      updatedAt: new Date().toISOString(),
    });
}

export async function loadGitHubConnection(projectId: string) {
  const document = await getFirebaseAdminDb()
    .collection("githubConnections")
    .doc(projectId)
    .get();
  if (!document.exists) return null;

  const data = document.data() as {
    token?: { ciphertext: string; iv: string; tag: string };
    githubLogin?: string | null;
  };
  if (!data.token) return null;
  return {
    accessToken: decryptGitHubToken(data.token),
    githubLogin: data.githubLogin || null,
  };
}
