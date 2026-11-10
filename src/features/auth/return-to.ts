export function safeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  try {
    const target = new URL(value, "http://localhost");
    if (target.origin !== "http://localhost" || target.pathname === "/login" || target.pathname === "/change-password") return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export function changePasswordPath(returnTo: string): string {
  return `/change-password?returnTo=${encodeURIComponent(safeReturnTo(returnTo))}`;
}
