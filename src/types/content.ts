// Контент онбординга (content/lido/cards.json): треки, карточки, сценарии и вопросы про структуру.

export type TrackId = 'policies' | 'structure' | 'glossary';

export interface Track {
  id: TrackId;
  title: string;
  subtitle: string;
  desc: string;
}

/** Карточка = «рабочее место»: front — вопрос/термин, back — ответ/смысл. */
export interface Card {
  id: string;
  track: TrackId;
  front: string;
  back: string;
  band: number;
}

export type Verdict = 'ok' | 'violation' | 'ask';

/** Ситуация для игры Pool Rules; `card` — карточка-правило, которую работа ответ. */
export interface Scenario {
  id: string;
  situation: string;
  verdict: Verdict;
  explain: string;
  card: string;
}

/** Вопрос для игры Who's Who; `card` — карточка, которую работа ответ. */
export interface StructureQuestion {
  id: string;
  q: string;
  a: string;
  wrong: string[];
  card: string;
}
