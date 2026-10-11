import { createHmac } from "node:crypto";

const MIN_SECRET_LENGTH = 32;

function getSigningSecret(name: "JWT_SECRET" | "LICENSE_SECRET" | "ADMIN_ACCESS_SECRET"): string {
  const configured = process.env[name];

  if (configured) {
    if (configured.length < MIN_SECRET_LENGTH) {
      throw new Error(`[FATAL] ${name} must be at least ${MIN_SECRET_LENGTH} characters long.`);
    }
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(`[FATAL] ${name} is required in production. Add it in Replit Secrets.`);
  }

  const developmentRoot = process.env.SESSION_SECRET;
  if (!developmentRoot || developmentRoot.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `[FATAL] ${name} is missing and no strong SESSION_SECRET is available for development key derivation.`,
    );
  }

  console.warn(`[SECURITY] ${name} is derived from SESSION_SECRET for development only.`);
  return createHmac("sha256", developmentRoot)
    .update(`zenipost:${name}:development:v1`)
    .digest("hex");
}

export const JWT_SECRET = getSigningSecret("JWT_SECRET");
export const LICENSE_SECRET = getSigningSecret("LICENSE_SECRET");
export const ADMIN_ACCESS_SECRET = getSigningSecret("ADMIN_ACCESS_SECRET");
