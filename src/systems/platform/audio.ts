// Общий AudioContext для эффектов (`sfx.ts`) и музыки (`music.ts`). Голоса в игре нет: только синтез эффектов и музыка.
// Контекст создаётся и будится на первом жесте игрока (click/touchend: для iOS это «жест»), при возврате на вкладку — resume.

let ctx: AudioContext | null = null;

export function audioContext(): AudioContext | null {
  return ctx;
}

/**
 * Разблокировка аудио: AudioContext. Вызывать строго внутри обработчика жеста (tap/click): синхронная часть идёт первой.
 */
export async function unlockAudio(): Promise<boolean> {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return false;
    ctx ??= new Ctor();
    // Тихий буфер: iOS разблокирует вывод только после реального воспроизведения внутри жеста.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
    if (ctx.state !== 'running') await ctx.resume();
    return ctx.state === 'running';
  } catch (err) {
    console.warn('audio unlock failed', err);
    return false;
  }
}

/** Склейка (main.ts): разблокировка на первом жесте, `visibilitychange` → `AudioContext.resume()`. Возвращает отписку. */
export function connectAudio(doc: Document = document): () => void {
  const onGesture = (): void => {
    if (ctx?.state === 'running') return;
    void unlockAudio();
  };
  doc.addEventListener('click', onGesture, true);
  doc.addEventListener('touchend', onGesture, true);
  const onVis = (): void => {
    if (doc.visibilityState !== 'hidden' && ctx && ctx.state !== 'running') void ctx.resume().catch(() => undefined);
  };
  doc.addEventListener('visibilitychange', onVis);
  return () => {
    doc.removeEventListener('click', onGesture, true);
    doc.removeEventListener('touchend', onGesture, true);
    doc.removeEventListener('visibilitychange', onVis);
  };
}
