// Tiny cross-component event bus for Phase 5 gamification + future broadcasts.
// Wraps a singleton EventTarget so any module can publish / subscribe without
// threading callbacks through props or depending on React context.
//
// Discipline: keep the event set small and typed. If an event has more than
// one consumer or needs structured payloads, add it here rather than letting
// strings leak across the codebase.

export type ArcadiaEventMap = {
  /** Fired once when the caller's memberships.level just increased. Payload
   *  is the NEW level. Consumed by LevelUpBanner (Phase 5). */
  'level-up': number;
};

type EventName = keyof ArcadiaEventMap;

type Listener<E extends EventName> = (payload: ArcadiaEventMap[E]) => void;

class ArcadiaEventBus {
  private readonly target = new EventTarget();

  on<E extends EventName>(event: E, listener: Listener<E>): () => void {
    const handler = (e: Event): void => {
      listener((e as CustomEvent<ArcadiaEventMap[E]>).detail);
    };
    this.target.addEventListener(event, handler);
    return () => this.target.removeEventListener(event, handler);
  }

  emit<E extends EventName>(event: E, payload: ArcadiaEventMap[E]): void {
    this.target.dispatchEvent(new CustomEvent(event, { detail: payload }));
  }
}

export const eventBus = new ArcadiaEventBus();
