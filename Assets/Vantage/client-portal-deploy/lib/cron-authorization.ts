export function isAuthorizedCronRequest(
  authorization: string | null,
  cronSecret: string | undefined
) {
  return Boolean(
    cronSecret &&
      authorization &&
      authorization === `Bearer ${cronSecret}`
  );
}

export async function runSupabaseKeepAlive({
  authorization,
  cronSecret,
  query,
}: {
  authorization: string | null;
  cronSecret: string | undefined;
  query: () => Promise<{ error: unknown }>;
}) {
  if (!isAuthorizedCronRequest(authorization, cronSecret)) {
    return { status: 401, body: { ok: false } };
  }

  const { error } = await query();

  if (error) {
    return { status: 503, body: { ok: false } };
  }

  return { status: 200, body: { ok: true } };
}
