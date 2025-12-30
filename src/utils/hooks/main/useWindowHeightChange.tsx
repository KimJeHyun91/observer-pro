import { useEffect, useRef, useState } from 'react';

export function useWindowSizeChange(
  onChange: (height: number, width: number) => void,
  delay = 200,
) {
  const [prevHeight, setPrevHeight] = useState(window.innerHeight);
  const [prevWidth, setPrevWidth] = useState(window.innerWidth);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleResize = () => {
      if (document.fullscreenElement) return;

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        const currentHeight = window.innerHeight;
        const currentWidth = window.innerWidth;
        if (currentHeight !== prevHeight || currentWidth !== prevWidth) {
          setPrevHeight(currentHeight);
          setPrevWidth(currentWidth);
          onChange(currentHeight, currentWidth);
        }
      }, delay);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [prevHeight, prevWidth, onChange, delay]);
}