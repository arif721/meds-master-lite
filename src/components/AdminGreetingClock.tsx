import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatLiveClock, getGreeting } from '@/lib/format';

export function AdminGreetingClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState(getGreeting());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
      setGreeting(getGreeting());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const { time, date, day } = formatLiveClock(currentTime);

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-primary/5 border border-primary/10">
      <Clock className="w-4 h-4 text-primary" />
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-foreground">
          {greeting}, Admin
        </span>
        <span className="text-muted-foreground">—</span>
        <span className="font-mono text-primary font-semibold">{time}</span>
        <span className="text-muted-foreground">|</span>
        <span className="text-muted-foreground">{day}, {date}</span>
      </div>
    </div>
  );
}
