"use client";

import { useState, useEffect, useCallback } from "react";

type FontFamily = "sans" | "serif";
type ReaderTheme = "auto" | "sepia";

interface ReaderPreferences {
  fontSize: number;
  fontFamily: FontFamily;
  readerTheme: ReaderTheme;
}

const STORAGE_KEYS = {
  fontSize: "llp-reader-font-size",
  fontFamily: "llp-reader-font-family",
  readerTheme: "llp-reader-theme",
} as const;

const DEFAULTS: ReaderPreferences = {
  fontSize: 16,
  fontFamily: "sans",
  readerTheme: "auto",
};

export function useReaderPreferences() {
  const [prefs, setPrefs] = useState<ReaderPreferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const fontSize = parseInt(localStorage.getItem(STORAGE_KEYS.fontSize) || "", 10);
    const fontFamily = localStorage.getItem(STORAGE_KEYS.fontFamily) as FontFamily | null;
    const readerTheme = localStorage.getItem(STORAGE_KEYS.readerTheme) as ReaderTheme | null;

    setPrefs({
      fontSize: isNaN(fontSize) ? DEFAULTS.fontSize : Math.min(24, Math.max(12, fontSize)),
      fontFamily: fontFamily === "serif" ? "serif" : "sans",
      readerTheme: readerTheme === "sepia" ? "sepia" : "auto",
    });
    setLoaded(true);
  }, []);

  const setFontSize = useCallback((size: number | ((prev: number) => number)) => {
    setPrefs((prev) => {
      const next = typeof size === "function" ? size(prev.fontSize) : size;
      const clamped = Math.min(24, Math.max(12, next));
      localStorage.setItem(STORAGE_KEYS.fontSize, String(clamped));
      return { ...prev, fontSize: clamped };
    });
  }, []);

  const setFontFamily = useCallback((family: FontFamily) => {
    localStorage.setItem(STORAGE_KEYS.fontFamily, family);
    setPrefs((prev) => ({ ...prev, fontFamily: family }));
  }, []);

  const setReaderTheme = useCallback((theme: ReaderTheme) => {
    localStorage.setItem(STORAGE_KEYS.readerTheme, theme);
    setPrefs((prev) => ({ ...prev, readerTheme: theme }));
  }, []);

  return {
    ...prefs,
    loaded,
    setFontSize,
    setFontFamily,
    setReaderTheme,
  };
}
