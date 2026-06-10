import type { EsDictionary } from "./dictionaries/es";

/**
 * The dictionary contract. `es` is the reference shape; any additional locale
 * must satisfy the same structure, which gives compile-time safety that no
 * copy key is missing (BR-2.28, BR-2.29).
 */
export type Dictionary = EsDictionary;
