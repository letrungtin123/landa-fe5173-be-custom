/**
 * Keeps locale files structurally identical while allowing each language to
 * provide its own text. A missing English key is therefore a TypeScript error.
 */
export type TranslationSchema<T> = {
  [K in keyof T]: T[K] extends string ? string : TranslationSchema<T[K]>;
};
