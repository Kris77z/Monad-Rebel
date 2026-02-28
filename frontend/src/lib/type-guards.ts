/**
 * Safely cast an unknown value to a plain Record.
 * Returns null if the value is not a non-null object.
 *
 * Shared across panels, timeline, and dashboard to eliminate duplication.
 */
export function asRecord(v: unknown): Record<string, unknown> | null {
    return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}
