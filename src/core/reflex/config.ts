import type { ReflexConfig, ReflexMode, ReflexProviderId } from './types.js';

export const DEFAULT_REFLEX_MODE: ReflexMode = 'off';
export const DEFAULT_REFLEX_PROVIDER: ReflexProviderId = 'typesafe-jev';
export const DEFAULT_REFLEX_MODEL = 'jev-1.13.0';
export const DEFAULT_REFLEX_TIMEOUT_MS = 1200;
export const DEFAULT_REFLEX_MIN_MARGIN = 0.2;
export const DEFAULT_REFLEX_TELEMETRY = 'local';

/**
 * Loads Reflex configuration from environment variables with fallback defaults.
 * API key is read strictly into memory and never exposed or logged.
 */
export function loadReflexConfig(overrides?: Partial<ReflexConfig>): ReflexConfig {
  const env = process.env;

  const rawMode = (overrides?.mode || env.FABLE_REFLEX_MODE || DEFAULT_REFLEX_MODE).toLowerCase();
  const validModes: ReflexMode[] = ['off', 'shadow', 'recommend', 'guarded', 'authority'];
  const mode: ReflexMode = validModes.includes(rawMode as ReflexMode) ? (rawMode as ReflexMode) : 'off';

  const provider: ReflexProviderId =
    overrides?.provider || (env.FABLE_REFLEX_PROVIDER as ReflexProviderId) || DEFAULT_REFLEX_PROVIDER;

  const model = overrides?.model || env.FABLE_REFLEX_MODEL || DEFAULT_REFLEX_MODEL;

  const timeoutMs =
    overrides?.timeoutMs ??
    (env.FABLE_REFLEX_TIMEOUT_MS ? parseInt(env.FABLE_REFLEX_TIMEOUT_MS, 10) : DEFAULT_REFLEX_TIMEOUT_MS);

  const minMargin =
    overrides?.minMargin ??
    (env.FABLE_REFLEX_MIN_MARGIN ? parseFloat(env.FABLE_REFLEX_MIN_MARGIN) : DEFAULT_REFLEX_MIN_MARGIN);

  const rawTelemetry = (overrides?.telemetry || env.FABLE_REFLEX_TELEMETRY || DEFAULT_REFLEX_TELEMETRY).toLowerCase();
  const telemetry = rawTelemetry === 'off' ? 'off' : 'local';

  const apiKey = overrides?.apiKey || env.TYPESAFE_API_KEY || undefined;

  return {
    mode,
    provider,
    model,
    timeoutMs: isNaN(timeoutMs) || timeoutMs <= 0 ? DEFAULT_REFLEX_TIMEOUT_MS : timeoutMs,
    minMargin: isNaN(minMargin) || minMargin < 0 || minMargin > 1 ? DEFAULT_REFLEX_MIN_MARGIN : minMargin,
    telemetry,
    apiKey,
  };
}
