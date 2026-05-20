/**
 * Core API wrapper to automatically handle auth tokens and JSON parsing.
 */
export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token");
  
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = "An error occurred";
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText;
    }
    
    // Only auto-logout on 401 if there was a token (expired session, not anonymous visit)
    if (response.status === 401 && token) {
      localStorage.removeItem("token");
      window.dispatchEvent(new Event("auth-unauthorized"));
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}
