export async function readJson<T = unknown>(res: Response): Promise<T> {
  const ct = res.headers.get("content-type") ?? "";
  const text = await res.text();
  if (!ct.includes("application/json")) {
    if (res.status === 404 || res.status === 401) {
      throw new Error("Session expired — sign in again");
    }
    throw new Error(`Server returned ${res.status} ${res.statusText}`.trim());
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON response from server");
  }
}
