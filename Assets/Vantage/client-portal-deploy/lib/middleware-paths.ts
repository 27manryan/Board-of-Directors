export function bypassPortalAuthentication(pathname: string) {
  return (
    pathname.startsWith("/api/cron/") ||
    pathname === "/api/stripe/webhook"
  );
}
