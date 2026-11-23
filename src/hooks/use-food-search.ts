"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { FoodSearchResult } from "@/types/nutrition.types";

// ─────────────────────────────────────────────
// useFoodSearch — debounced food search hook
// ─────────────────────────────────────────────

export function useFoodSearch(debounceMs = 300) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);
    // Abort previous request
    if (abortRef.current) abortRef.current.abort();

    if (!q || q.trim().length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = `/api/nutrition/foods?q=${encodeURIComponent(q.trim())}&limit=25`;
        const res = await fetch(url, { signal: controller.signal });

        if (!res.ok) throw new Error("Search failed");

        const json = await res.json();
        if (json.success) {
          setResults(json.data as FoodSearchResult[]);
        } else {
          throw new Error(json.error ?? "Search failed");
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Search failed");
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);
  }, [debounceMs]);

  // Search from the change handler rather than an effect on `query`.
  const updateQuery = useCallback(
    (q: string) => {
      setQuery(q);
      search(q);
    },
    [search],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const clearSearch = useCallback(() => {
    setQuery("");
    search(""); // cancels any pending timer / request and clears results
    setError(null);
  }, [search]);

  return { query, setQuery: updateQuery, results, isLoading, error, clearSearch };
}
