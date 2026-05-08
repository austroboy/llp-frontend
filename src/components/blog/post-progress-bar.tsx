"use client";

import { useState, useEffect } from "react";

export function PostProgressBar() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      const scrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const maxScroll = documentHeight - windowHeight;

      if (maxScroll <= 0) {
        setProgress(0);
        return;
      }

      setProgress(Math.min((scrollY / maxScroll) * 100, 100));
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 z-50 h-[3px] bg-primary transition-[width] duration-75"
      style={{ width: `${progress}%` }}
    />
  );
}
