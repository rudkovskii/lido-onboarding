// Настройки service worker'а (vite.config.ts → vite-plugin-pwa, generateSW). Вынесены сюда, чтобы тест проверял ту же
// конфигурацию, что уходит в сборку, без запуска Vite.

export const BASE = '/lido-onboarding/';

/** Опции `workbox` для VitePWA (generateSW). */
export function workboxOptions() {
  return {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{js,css,html,png,json,webmanifest}'],
    // version.json — всегда из сети: по нему видно, что страница из старого кэша.
    globIgnores: ['**/version.json'],
    maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
    navigateFallback: 'index.html',
    navigateFallbackDenylist: [/supabase/],
    // Параметры адреса (?dev, ?mute…) — только для клиента: страница из precache и с ними.
    ignoreURLParametersMatching: [/.*/],
  };
}
