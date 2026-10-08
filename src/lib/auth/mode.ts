export const AUTH_MODES = ["owner", "none"] as const;
export type AuthMode = (typeof AUTH_MODES)[number];

export const DEFAULT_AUTH_MODE: AuthMode = "owner";

export function parseAuthMode(value: string | null | undefined): AuthMode {
  return value?.trim().toLowerCase() === "none" ? "none" : DEFAULT_AUTH_MODE;
}

export function getAuthMode(): AuthMode {
  return parseAuthMode(process.env.AUTH_MODE);
}

export function isAuthDisabled(): boolean {
  return getAuthMode() === "none";
}
