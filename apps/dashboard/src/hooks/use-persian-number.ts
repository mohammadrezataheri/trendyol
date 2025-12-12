import { useMemo } from 'react';
import { formatPersianNumber, toPersianNumber } from '../utils/persian-number';

/**
 * Hook برای تبدیل اعداد به فارسی
 */
export function usePersianNumber() {
  return useMemo(
    () => ({
      format: formatPersianNumber,
      convert: toPersianNumber,
    }),
    []
  );
}

