'use client';

import useSWR from 'swr';
import { useEffect, useMemo } from 'react';
import type { HunterProfile } from '@/types/hunter-profile';

const PROFILE_CACHE_KEY = 'rebel_hunter_profile_cache_v1';
const PROFILE_CACHE_VERSION = 1;
const DEFAULT_CACHE_TTL_MS = 10 * 60 * 1000;

interface PersistedProfileCache {
  version: number;
  savedAt: number;
  profile: HunterProfile;
}

export interface UseHunterProfileOptions {
  refreshIntervalMs?: number;
  cacheTtlMs?: number;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

function readCachedProfile(ttlMs: number): HunterProfile | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PersistedProfileCache;
    if (
      parsed.version !== PROFILE_CACHE_VERSION ||
      !Number.isFinite(parsed.savedAt) ||
      !parsed.profile ||
      typeof parsed.profile !== 'object'
    ) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return undefined;
    }
    const ageMs = Date.now() - parsed.savedAt;
    if (ageMs > ttlMs) {
      localStorage.removeItem(PROFILE_CACHE_KEY);
      return undefined;
    }
    return parsed.profile;
  } catch {
    return undefined;
  }
}

function writeCachedProfile(profile: HunterProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedProfileCache = {
      version: PROFILE_CACHE_VERSION,
      savedAt: Date.now(),
      profile,
    };
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage errors and continue with in-memory SWR cache.
  }
}

async function fetchHunterProfile(): Promise<HunterProfile> {
  const response = await fetch('/api/hunter/profile', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as HunterProfile;
}

export function useHunterProfile(options: UseHunterProfileOptions = {}) {
  const configuredRefreshMs = parsePositiveInt(process.env.NEXT_PUBLIC_HUNTER_PROFILE_REFRESH_MS);
  const configuredCacheTtlMs = parsePositiveInt(process.env.NEXT_PUBLIC_HUNTER_PROFILE_CACHE_TTL_MS);
  const refreshIntervalMs = options.refreshIntervalMs ?? configuredRefreshMs ?? 0;
  const cacheTtlMs = options.cacheTtlMs ?? configuredCacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const fallbackData = useMemo(() => readCachedProfile(cacheTtlMs), [cacheTtlMs]);

  const { data, error, isLoading, mutate } = useSWR<HunterProfile>(
    '/api/hunter/profile',
    fetchHunterProfile,
    {
      fallbackData,
      refreshInterval: refreshIntervalMs,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      keepPreviousData: true,
      dedupingInterval: 2000,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  useEffect(() => {
    if (!data) return;
    writeCachedProfile(data);
  }, [data]);

  return {
    profile: data ?? null,
    loading: isLoading,
    error: error ? toErrorMessage(error) : null,
    mutate,
  };
}
