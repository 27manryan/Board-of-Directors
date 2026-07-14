// Single source of truth for admin identity. Ryan is the only admin.
// Mirrors the hardcoded email in the Supabase `is_admin()` SQL function.
// Pure constants only — safe to import from Edge middleware, client, and server.
export const ADMIN_EMAIL = "27manryan@gmail.com";

// Case-insensitive admin check. Supabase normalizes stored emails to lowercase,
// but login compares against raw form input, so always lowercase before comparing.
export function isAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === ADMIN_EMAIL;
}
