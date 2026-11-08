import { describe, expect, it } from 'vitest';
import {
  isMissingColumnError,
  isUserSettingsMomoInfoColumnMissing,
} from './postgrest-errors';

describe('postgrest-errors', () => {
  it('detects missing momo_info column from Postgres 42703', () => {
    expect(
      isUserSettingsMomoInfoColumnMissing({
        code: '42703',
        message: 'column user_settings.momo_info does not exist',
      })
    ).toBe(true);
  });

  it('detects missing column from PGRST204', () => {
    expect(isMissingColumnError({ code: 'PGRST204', message: 'momo_info' }, 'momo_info')).toBe(
      true
    );
  });
});
