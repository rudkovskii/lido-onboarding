// Термины игры для новичка: названия мини-игр, значки игр на доске и стадии роста с подписью. Чистые данные, без Phaser.
import type { GameMode } from '../systems/content';
import type { Stage } from '../types/plan';
import type { IconKey } from './stageIcon';

/** Название мини-игры и что в ней делать. */
export const MODE_NAME: Record<GameMode, { title: string; short: string; sub: string }> = {
  1: { title: 'Pool Rules', short: 'Pool Rules', sub: 'Phantom policies: OK, Violation or Ask first' },
  2: { title: "Who's Who", short: "Who's Who", sub: 'How Lido is organised: who does what' },
  3: { title: 'Staking 101', short: 'Staking 101', sub: 'Terms you will hear on day one' },
};

/** Значок игры в киоске. */
export const MODE_ICON: Record<GameMode, string> = { 1: '📋', 2: '🧭', 3: '💧' };

/** Стадии роста: подпись, значок атласа и пояснение в одну строку. */
export const STAGE_INFO: Record<Stage, { label: string; icon: IconKey; hint: string }> = {
  new: { label: 'New', icon: 'icon_new', hint: 'just added to your plan' },
  started: { label: 'Started', icon: 'icon_started', hint: 'getting familiar' },
  practiced: { label: 'Practiced', icon: 'icon_practiced', hint: 'almost there' },
  mastered: { label: 'Mastered', icon: 'icon_mastered', hint: 'done, goes to the Learned shelf' },
};
