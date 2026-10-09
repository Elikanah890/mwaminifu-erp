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
  language: { value: 'sw', description: 'Default interface language' },
  currency: { value: 'TZS', description: 'Default currency' },
  supportEmail: { value: 'support@mwaminifu.app', description: 'Support email address' },
  supportPhone: { value: '', description: 'Support phone number' },
  maintenanceMode: { value: false, description: 'Enable maintenance mode (blocks non-admin access)' },
  defaultPageSize: { value: 10, description: 'Default list page size' },
  otpLifetimeMinutes: { value: 5, description: 'OTP validity in minutes' },
  syncIntervalSeconds: { value: 30, description: 'Mobile offline sync interval in seconds' },
  agentCommissionPerReferral: { value: 5000, description: 'Commission (TZS) paid to an agent per referred business owner' },

  // Subscription settings
  basicPrice: { value: 5000, description: 'Monthly Basic plan price (TZS)' },
  premiumPrice: { value: 8000, description: 'Monthly Premium plan price (TZS)' },
  gracePeriodDays: { value: 5, description: 'Grace period (days) before a lapsed subscription is deactivated' },
  maxShopsPerOwner: { value: 5, description: 'Maximum shops a business owner can create' },

  // Agent settings
  maxAgents: { value: 50, description: 'Maximum number of agents' },
  commissionRate: { value: 5, description: 'Agent commission as a percentage' },
  agentCodePrefix: { value: 'AGAC-', description: 'Prefix used for agent codes' },

  // Demo accounts
  demoAccountsCount: { value: 3, description: 'Number of demo accounts' },
  demoAutoResetFrequency: { value: 'weekly', description: 'How often demo data is reset (daily/weekly/monthly)' },

  // Payment aggregator
  paymentAggregator: { value: 'clickpesa', description: 'Payment aggregator provider' },
  webhookUrl: { value: '', description: 'Payment callback endpoint' },
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

  /** Cached full settings snapshot — avoids a DB load on every public /config hit. */
  async getAll(): Promise<SystemSettings> {
    return this.getCached();
  }

  private coerce(key: string, raw: unknown): unknown {
    const def = SETTINGS_DEFAULTS[key]?.value;
    if (typeof def === 'boolean') return raw === true || raw === 'true';
    if (typeof def === 'number') return Number(raw) || Number(def) || 0;
    // Fall back to the default when a string setting is missing or blank.
    if (typeof def === 'string') {
      const value = raw == null || raw === '' ? def : raw;
      return String(value ?? '');
    }
    return raw;
  }

  invalidate(): void {
    cacheLoadedAt = 0;
  }
}

export const settingsService = new SettingsService();