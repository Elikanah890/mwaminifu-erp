import prisma from '../config/database';
import { Prisma } from '@prisma/client';

export interface SystemSettings {
  appName: string;
  currency: string;
  supportEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
  defaultPageSize: number;
  otpLifetimeMinutes: number;
  syncIntervalSeconds: number;
  [key: string]: unknown;
}

export const SETTINGS_DEFAULTS: Record<string, { value: unknown; description: string }> = {
  appName: { value: 'Mwaminifu', description: 'Platform display name' },
  currency: { value: 'TZS', description: 'Default currency' },
  supportEmail: { value: 'support@mwaminifu.app', description: 'Support email address' },
  supportPhone: { value: '', description: 'Support phone number' },
  maintenanceMode: { value: false, description: 'Enable maintenance mode (blocks non-admin access)' },
  defaultPageSize: { value: 10, description: 'Default list page size' },
  otpLifetimeMinutes: { value: 5, description: 'OTP validity in minutes' },
  syncIntervalSeconds: { value: 30, description: 'Mobile offline sync interval in seconds' },
};

// In-memory cache with a short TTL. Loaded on startup and whenever settings are
// updated by the admin, so consumers (OTP, pagination, maintenance, config)
// see fresh values without a DB hit on every request.
let cache: SystemSettings = Object.fromEntries(
  Object.entries(SETTINGS_DEFAULTS).map(([k, v]) => [k, v.value])
) as SystemSettings;
let cacheLoadedAt = 0;
const CACHE_TTL_MS = 30 * 1000;

export class SettingsService {
  async ensureDefaults(): Promise<void> {
    const existing = await prisma.systemSetting.findMany();
    const existingKeys = new Set(existing.map((s) => s.key));
    const missing = Object.entries(SETTINGS_DEFAULTS).filter(([key]) => !existingKeys.has(key));
    if (missing.length) {
      await prisma.systemSetting.createMany({
        data: missing.map(([key, def]) => ({
          key,
          value: def.value as Prisma.InputJsonValue,
          description: def.description,
        })),
      });
    }
  }

  async load(): Promise<SystemSettings> {
    await this.ensureDefaults();
    const settings = await prisma.systemSetting.findMany();
    const fresh: SystemSettings = { ...cache };
    for (const s of settings) {
      fresh[s.key] = this.coerce(s.key, s.value);
    }
    cache = fresh;
    cacheLoadedAt = Date.now();
    return fresh;
  }

  async get<K extends keyof SystemSettings>(key: K): Promise<SystemSettings[K]> {
    return (await this.getCached())[key] as SystemSettings[K];
  }

  private async getCached(): Promise<SystemSettings> {
    if (Date.now() - cacheLoadedAt > CACHE_TTL_MS) {
      try {
        await this.load();
      } catch {
        // DB unreachable: serve stale cache rather than crash every request.
      }
    }
    return cache;
  }

  /** Synchronous read for hot paths (pagination default). Uses the last known cache. */
  getSync<K extends keyof SystemSettings>(key: K): SystemSettings[K] {
    return cache[key] as SystemSettings[K];
  }

  private coerce(key: string, raw: unknown): unknown {
    const def = SETTINGS_DEFAULTS[key]?.value;
    if (typeof def === 'boolean') return raw === true || raw === 'true';
    if (typeof def === 'number') return Number(raw) || Number(def) || 0;
    if (typeof def === 'string') return String(raw ?? def ?? '');
    return raw;
  }

  invalidate(): void {
    cacheLoadedAt = 0;
  }
}

export const settingsService = new SettingsService();