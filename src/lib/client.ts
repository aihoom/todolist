export async function api<T>(
  url: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, headers, ...rest } = options ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "请求失败，请稍后重试"
    );
  }
  return data as T;
}
