// Термины игры для новичка: названия мини-игр, значки игр на доске и стадии роста с подписью. Чистые данные, без Phaser.
import type { GameMode } from '../systems/content';
import type { Stage } from '../types/farm';
import type { IconKey } from './stageIcon';

/** Название мини-игры и что в ней делать. */
export const MODE_NAME: Record<GameMode, { title: string; short: string; sub: string }> = {
  1: { title: 'Pool Rules', short: 'Pool Rules', sub: 'Phantom policies: OK, Violation or Ask first' },
  2: { title: "Who's Who", short: "Who's Who", sub: 'How Lido is organised: who does what' },
  3: { title: 'Staking 101', short: 'Staking 101', sub: 'Terms you will hear on day one' },
};

/** Значок игры на доске. */
export const MODE_ICON: Record<GameMode, string> = { 1: '📋', 2: '🧭', 3: '💧' };

/** Стадии роста: подпись, значок атласа и пояснение в одну строку. */
export const STAGE_INFO: Record<Stage, { label: string; icon: IconKey; hint: string }> = {
  seed: { label: 'seed', icon: 'icon_seed', hint: 'just planted' },
  sprout: { label: 'sprout', icon: 'icon_sprout', hint: 'getting familiar' },
  bush: { label: 'bush', icon: 'icon_bush', hint: 'almost learned' },
  ripe: { label: 'ripe', icon: 'icon_ripe', hint: 'learned, goes to the shelf' },
};
