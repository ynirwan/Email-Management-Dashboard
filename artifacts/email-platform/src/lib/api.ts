/**
 * Core API wrapper — handles auth and JSON parsing.
 *
 * Auth model (post BUG-11 fix):
 *   • The JWT lives in an httpOnly SameSite=Strict cookie set by the server.
 *     JS never reads or writes the raw token.
 *   • credentials: "include" makes the browser send the cookie automatically.
 *   • A non-httpOnly `logged_in=1` flag cookie signals an active session so
 *     components can gate rendering without a round-trip.
 */

export function isSessionActive(): boolean {
  return document.cookie.split(";").some((c) => c.trim().startsWith("logged_in="));
}

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  // No Authorization header — the httpOnly cookie is sent automatically.

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "include",   // ← send the auth cookie with every request
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText;
    }

    if (response.status === 401) {
      // Clear the JS-readable session flag so the UI reacts immediately.
      document.cookie = "logged_in=; path=/; max-age=0; SameSite=Strict";
      window.dispatchEvent(new Event("auth-unauthorized"));
    }

    throw new Error(errorMessage);
  }

  return response.json();
}
