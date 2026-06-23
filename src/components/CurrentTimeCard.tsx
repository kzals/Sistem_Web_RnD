'use client';

import { useEffect, useState } from 'react';
import { formatDateTimeWib } from '@/lib/datetime';

export default function CurrentTimeCard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  return <div className="mt-1 text-sm font-semibold text-slate-800">{formatDateTimeWib(currentTime)}</div>;
}
