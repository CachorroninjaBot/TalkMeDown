import { useEffect, useState } from 'react';
import { fetchLocaleResource, type LocalePayload } from '../i18n';

const cache = new Map<string, Promise<LocalePayload>>();

export function loadContentResource(code: string): Promise<LocalePayload> {
  let pending = cache.get(code);
  if (!pending) {
    pending = fetchLocaleResource(code).catch((error: unknown) => {
      cache.delete(code);
      throw error;
    });
    cache.set(code, pending);
  }
  return pending;
}

export function useContentResource(code: string | null | undefined): LocalePayload | null {
  const [payload, setPayload] = useState<LocalePayload | null>(null);

  useEffect(() => {
    if (!code) {
      setPayload(null);
      return;
    }
    let cancelled = false;
    loadContentResource(code)
      .then((next) => {
        if (!cancelled) setPayload(next);
      })
      .catch(() => {
        if (!cancelled) setPayload(null);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  return payload;
}

function resolvePath(resource: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[key];
  }, resource);
}

export function contentText(
  resource: Record<string, unknown> | null | undefined,
  path: string,
  fallback = '',
): string {
  if (!resource) return fallback;
  const value = resolvePath(resource, path);
  return typeof value === 'string' ? value : fallback;
}

export function contentList(
  resource: Record<string, unknown> | null | undefined,
  path: string,
): string[] {
  if (!resource) return [];
  const value = resolvePath(resource, path);
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}
