/**
 * Shared Supabase Realtime channel/event for live result pushes (Unit 58).
 *
 * Imported by BOTH the server-side broadcaster (`broadcast-results-updated.ts`)
 * and the client subscription hook (`hooks/use-live-results.ts`), so this file
 * must stay free of any server-only or client-only dependency.
 */
export const LIVE_RESULTS_CHANNEL = "live-results";
export const RESULTS_UPDATED_EVENT = "results-updated";
