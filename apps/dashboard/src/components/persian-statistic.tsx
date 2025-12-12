'use client';

import { Statistic, StatisticProps } from 'antd';
import { formatPersianNumber } from '../utils/persian-number';

interface PersianStatisticProps extends StatisticProps {
  value: number | string;
}

export function PersianStatistic({ value, ...props }: PersianStatisticProps) {
  return (
    <Statistic
      {...props}
      value={formatPersianNumber(value)}
      valueStyle={{
        fontFamily: "'Vazirmatn', sans-serif",
        ...props.valueStyle,
      }}
    />
  );
}

