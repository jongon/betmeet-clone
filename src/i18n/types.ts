import type { EsDictionary } from "./dictionaries/es";

type WidenStrings<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly WidenStrings<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: WidenStrings<T[Key]> }
      : T;

/**
 * The dictionary contract. `es` is the reference shape; any additional locale
 * must satisfy the same structure, which gives compile-time safety that no
 * copy key is missing (BR-2.28, BR-2.29).
 */
export type Dictionary = WidenStrings<EsDictionary>;
