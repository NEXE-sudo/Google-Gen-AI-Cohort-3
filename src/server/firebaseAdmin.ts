import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminAuth: Auth | null = null;
let adminDb: Firestore | null = null;

function createCredential() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    const serviceAccount = JSON.parse(serviceAccountJson) as {
      project_id: string;
      client_email: string;
      private_key: string;
    };
    return cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, "\n"),
    });
  }

  return applicationDefault();
}

export function getFirebaseAdminApp(): App {
  if (adminApp) return adminApp;

  adminApp =
    getApps()[0] ||
    initializeApp({
      credential: createCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

  return adminApp;
}

export function getFirebaseAdminAuth(): Auth {
  if (!adminAuth) adminAuth = getAuth(getFirebaseAdminApp());
  return adminAuth;
}

export function getFirebaseAdminDb(): Firestore {
  if (!adminDb) adminDb = getFirestore(getFirebaseAdminApp());
  return adminDb;
}

export function getFirebaseAdminStatus() {
  return {
    configured: Boolean(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.K_SERVICE,
    ),
    projectId: process.env.FIREBASE_PROJECT_ID || null,
  };
}
