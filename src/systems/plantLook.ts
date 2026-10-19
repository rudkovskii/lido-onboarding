// Вид растения: один из 16 кустов (`plant_v00…v15`, art/plants), выбирается по id карточки. Детерминировано: та же карточка, тот же куст.
import type { PlantLook } from '../types/farm';

export type { PlantLook } from '../types/farm';

export const VARIANT_COUNT = 16;

/** CRC-32 строки: вариант куста для карточки. */
export function crc32(s: string): number {
  const bytes = new TextEncoder().encode(s);
  let c = ~0;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

export function lookOf(id: string): PlantLook {
  return { type: 'plant', variant: crc32(id) % VARIANT_COUNT };
}

/** Кадры атласа для вида (`<лист>/<n>`): росток, куст, созревший. */
export interface LookFrames {
  sprout: string;
  bush: string;
  ripe: string;
}

export function framesOf(look: PlantLook): LookFrames {
  const sheet = `plant_v${String(look.variant).padStart(2, '0')}`;
  return { sprout: `${sheet}/0`, bush: `${sheet}/1`, ripe: `${sheet}/2` };
}
