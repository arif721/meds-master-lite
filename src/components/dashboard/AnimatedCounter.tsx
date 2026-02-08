import { useEffect, useRef, useState } from 'react';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ value, prefix = '', suffix = '', decimals = 2, duration = 800, className = '' }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number | null>(null);
  const startTime = useRef(0);
  const startVal = useRef(0);

  useEffect(() => {
    startVal.current = display;
    startTime.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal.current + (value - startVal.current) * eased;
      setDisplay(current);
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value, duration]);

  const formatted = display.toLocaleString('en-BD', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}
