/**
 * Shared Event & Domain Types
 *
 * Canonical location for types that are used across workers, lib modules,
 * and handlers.  Previously these lived in workers/types.ts which created
 * a circular-dependency risk (workers -> lib -> workers/types).
 *
 * workers/types.ts now re-exports everything from here so existing
 * import paths continue to compile without changes during the transition.
 */
export {};
//# sourceMappingURL=events.js.map