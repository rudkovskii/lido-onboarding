// Контент онбординга: треки, карточки, сценарии, вопросы про структуру (content/lido/cards.json, читается при сборке).
import cardsJson from '../../content/lido/cards.json';
import type { Card, Scenario, StructureQuestion, Track, TrackId } from '../types/content';

const DOC = cardsJson as unknown as { tracks: Track[]; cards: Card[]; scenarios: Scenario[]; structureQuestions: StructureQuestion[] };

export const TRACKS: readonly Track[] = DOC.tracks;
export const CARDS: readonly Card[] = DOC.cards;
export const SCENARIOS: readonly Scenario[] = DOC.scenarios;
export const STRUCTURE_QUESTIONS: readonly StructureQuestion[] = DOC.structureQuestions;

export const CARD_BY_ID: ReadonlyMap<string, Card> = new Map(CARDS.map((c) => [c.id, c]));
export const TRACK_BY_ID: ReadonlyMap<string, Track> = new Map(TRACKS.map((t) => [t.id, t]));

/** Карточки одного трека в порядке файла. */
export const cardsOf = (track: TrackId): Card[] => CARDS.filter((c) => c.track === track);

/** Мини-игры: номер → трек. 1 Pool Rules, 2 Who's Who, 3 Staking 101. */
export type GameMode = 1 | 2 | 3;
export const MODE_TRACK: Record<GameMode, TrackId> = { 1: 'policies', 2: 'structure', 3: 'glossary' };
export const GAME_MODES: readonly GameMode[] = [1, 2, 3];

export const isCard = (id: string): boolean => CARD_BY_ID.has(id);

/** Короткая подпись карточки для надписи над рабочее место. */
export function labelOf(id: string, max = 26): string {
  const f = CARD_BY_ID.get(id)?.front ?? id;
  return f.length <= max ? f : `${f.slice(0, max - 1).trimEnd()}…`;
}
