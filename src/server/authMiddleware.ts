import type { NextFunction, Request, Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getFirebaseAdminAuth } from "./firebaseAdmin";

declare global {
  namespace Express {
    interface Request {
      authUser?: DecodedIdToken;
    }
  }
}

function getBearerToken(request: Request): string | null {
  const header = request.header("authorization");
  if (!header) return null;

  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction,
) {
  const token = getBearerToken(request);
  if (!token) {
    response.status(401).json({ error: "Authentication is required." });
    return;
  }

  try {
    request.authUser = await getFirebaseAdminAuth().verifyIdToken(token);
    next();
  } catch (error) {
    console.warn("Firebase ID token verification failed:", error);
    response
      .status(401)
      .json({ error: "The authentication token is invalid or expired." });
  }
}

export function getAuthenticatedUser(request: Request): DecodedIdToken {
  if (!request.authUser) {
    throw new Error("Authenticated user is missing from the request.");
  }
  return request.authUser;
}
