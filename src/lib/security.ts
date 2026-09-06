export type Role = "owner" | "admin" | "member" | "viewer";

export type AuditAction =
  | "project_created"
  | "member_added"
  | "incident_created"
  | "incident_resolved"
  | "security_review_confirmed"
  | "github_repo_connected"
  | "ai_action_confirmed";

export function redactSecrets(value: string): string {
  return value
    .replace(/(ghp_[A-Za-z0-9]+)/gi, "[REDACTED_GITHUB_TOKEN]")
    .replace(/(AIza[0-9A-Za-z\-_]+)/gi, "[REDACTED_GEMINI_KEY]")
    .replace(/(sk_live_[A-Za-z0-9]+)/gi, "[REDACTED_API_KEY]")
    .replace(/(Authorization:\s*Bearer\s*)([A-Za-z0-9._-]+)/gi, "$1[REDACTED]");
}

export function validatePromptInjection(input: string): {
  safe: boolean;
  reason?: string;
} {
  const value = (input || "").trim();
  if (!value) return { safe: true };

  const suspiciousPatterns = [
    /ignore previous instructions/i,
    /override system instructions/i,
    /forget all previous instructions/i,
    /act as admin/i,
    /reveal all secrets/i,
    /bypass auth/i,
    /disable security/i,
    /execute arbitrary commands/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(value)) {
      return {
        safe: false,
        reason:
          "External content contains instruction-like text that must be treated as untrusted input.",
      };
    }
  }

  return { safe: true };
}

export function canPerformAction(
  role: Role,
  action: "read" | "create" | "update" | "delete",
) {
  const permissions: Record<Role, string[]> = {
    owner: ["read", "create", "update", "delete"],
    admin: ["read", "create", "update"],
    member: ["read", "create", "update"],
    viewer: ["read"],
  };

  return permissions[role]?.includes(action) ?? false;
}

export function createAuditEvent(args: {
  actorId: string;
  action: AuditAction;
  resource: string;
  result: "success" | "failed";
  metadata?: Record<string, unknown>;
}) {
  const safeMetadata = args.metadata
    ? JSON.parse(
        JSON.stringify(args.metadata, (_key, value) => {
          if (typeof value === "string") {
            return redactSecrets(value);
          }
          return value;
        }),
      )
    : {};

  return {
    actorId: args.actorId,
    action: args.action,
    resource: args.resource,
    result: args.result,
    timestamp: new Date().toISOString(),
    metadata: safeMetadata,
  };
}

export function validateGitHubWebhookSignature({
  payload,
  signature,
  secret,
}: {
  payload: string;
  signature: string | undefined;
  secret: string;
}): boolean {
  if (!signature) return false;

  const crypto = require("node:crypto");
  const expected = `sha256=${crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex")}`;

  return crypto.timingSafeEqual(
    Buffer.from(expected, "utf8"),
    Buffer.from(signature, "utf8"),
  );
}

export function normalizeExternalText(input: string): string {
  return (input || "").replace(/\s+/g, " ").trim();
}
