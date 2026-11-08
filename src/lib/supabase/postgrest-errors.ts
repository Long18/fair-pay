/**
 * Helpers for classifying PostgREST / Postgres errors from the Supabase client.
 */

function asErrorRecord(err: unknown): { code?: string; message?: string } | null {
  if (!err || typeof err !== 'object') return null;
  return err as { code?: string; message?: string };
}

/** True when the API reports a missing DB column (common when migrations are not applied). */
export function isMissingColumnError(err: unknown, columnName?: string): boolean {
  const record = asErrorRecord(err);
  if (!record) return false;

  const code = record.code;
  if (code === '42703' || code === 'PGRST204') {
    if (!columnName) return true;
    const message = record.message?.toLowerCase() ?? '';
    return message.includes(columnName.toLowerCase());
  }

  if (columnName && record.message) {
    const message = record.message.toLowerCase();
    return (
      message.includes('does not exist') && message.includes(columnName.toLowerCase())
    );
  }

  return false;
}

export function isUserSettingsMomoInfoColumnMissing(err: unknown): boolean {
  return isMissingColumnError(err, 'momo_info');
}
