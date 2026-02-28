'use client';

import useSWR from 'swr';
import { useEffect, useMemo } from 'react';
import type { HunterProfile } from '@/types/hunter-profile';
import { useI18n } from '@/components/i18n/locale-provider';
import type { LanguageCode } from '@/types/agent';

const PROFILE_CACHE_KEY = 'rebel_hunter_profile_cache_v2';
const PROFILE_CACHE_VERSION = 2;
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

function getProfileCacheKey(locale: LanguageCode): string {
  return `${PROFILE_CACHE_KEY}:${locale}`;
}

function readCachedProfile(locale: LanguageCode, ttlMs: number): HunterProfile | undefined {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = localStorage.getItem(getProfileCacheKey(locale));
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as PersistedProfileCache;
    if (
      parsed.version !== PROFILE_CACHE_VERSION ||
      !Number.isFinite(parsed.savedAt) ||
      !parsed.profile ||
      typeof parsed.profile !== 'object'
    ) {
      localStorage.removeItem(getProfileCacheKey(locale));
      return undefined;
    }
    const ageMs = Date.now() - parsed.savedAt;
    if (ageMs > ttlMs) {
      localStorage.removeItem(getProfileCacheKey(locale));
      return undefined;
    }
    return parsed.profile;
  } catch {
    return undefined;
  }
}

function writeCachedProfile(locale: LanguageCode, profile: HunterProfile): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedProfileCache = {
      version: PROFILE_CACHE_VERSION,
      savedAt: Date.now(),
      profile,
    };
    localStorage.setItem(getProfileCacheKey(locale), JSON.stringify(payload));
  } catch {
    // Ignore storage errors and continue with in-memory SWR cache.
  }
}

async function fetchHunterProfile(locale: LanguageCode): Promise<HunterProfile> {
  const response = await fetch(`/api/hunter/profile?locale=${encodeURIComponent(locale)}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as HunterProfile;
}

export function useHunterProfile(options: UseHunterProfileOptions = {}) {
  const { locale } = useI18n();
  const configuredRefreshMs = parsePositiveInt(process.env.NEXT_PUBLIC_HUNTER_PROFILE_REFRESH_MS);
  const configuredCacheTtlMs = parsePositiveInt(process.env.NEXT_PUBLIC_HUNTER_PROFILE_CACHE_TTL_MS);
  const refreshIntervalMs = options.refreshIntervalMs ?? configuredRefreshMs ?? 0;
  const cacheTtlMs = options.cacheTtlMs ?? configuredCacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  const fallbackData = useMemo(() => readCachedProfile(locale, cacheTtlMs), [cacheTtlMs, locale]);

  const { data, error, isLoading, mutate } = useSWR<HunterProfile, Error, [string, LanguageCode]>(
    ['/api/hunter/profile', locale],
    ([, activeLocale]) => fetchHunterProfile(activeLocale),
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
    writeCachedProfile(locale, data);
  }, [data, locale]);

  return {
    profile: data ?? null,
    loading: isLoading,
    error: error ? toErrorMessage(error) : null,
    mutate,
  };
}
