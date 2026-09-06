export type ReflectionCategory =
  | "reflection"
  | "brainstorm"
  | "summary"
  | "gratitude"
  | "general";

export type ReflectionAction = "converse" | "brainstorm" | "summarize";

export interface ReflectionMessage {
  id: string;
  sender: "user" | "gemini";
  content: string;
  timestamp: string;
  action?: ReflectionAction;
  modelUsed?: string;
}

export interface ReflectionSession {
  id: string;
  userId: string;
  title: string;
  category: ReflectionCategory;
  summary?: string;
  messages: ReflectionMessage[];
  createdAt: string;
  updatedAt: string;
}

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
