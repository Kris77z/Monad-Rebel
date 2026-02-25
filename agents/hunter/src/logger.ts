/**
 * Structured console logger for hunter agent.
 * 
 * Prefixes all output with [hunter] and a timestamp.
 * Levels: info, warn, error, debug (debug only when HUNTER_DEBUG=true).
 */

const DEBUG_ENABLED = process.env.HUNTER_DEBUG === "true";

function timestamp(): string {
    return new Date().toISOString().slice(11, 23); // HH:mm:ss.SSS
}

function formatArgs(args: unknown[]): string {
    return args
        .map((arg) => {
            if (typeof arg === "string") return arg;
            try {
                return JSON.stringify(arg, null, 0);
            } catch {
                return String(arg);
            }
        })
        .join(" ");
}

export function hunterLog(...args: unknown[]): void {
    console.log(`[hunter ${timestamp()}]`, formatArgs(args));
}

export function hunterWarn(...args: unknown[]): void {
    console.warn(`[hunter ${timestamp()}] ⚠`, formatArgs(args));
}

export function hunterError(...args: unknown[]): void {
    console.error(`[hunter ${timestamp()}] ✗`, formatArgs(args));
}

export function hunterDebug(...args: unknown[]): void {
    if (!DEBUG_ENABLED) return;
    console.log(`[hunter ${timestamp()}] 🔍`, formatArgs(args));
}
