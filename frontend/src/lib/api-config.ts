/**
 * Backend API endpoint configuration.
 * Values are loaded from NEXT_PUBLIC_* env vars with sensible defaults.
 */
export const apiBase = {
    hunter: process.env.NEXT_PUBLIC_HUNTER_URL ?? "http://localhost:3002",
    writer: process.env.NEXT_PUBLIC_WRITER_URL ?? "http://localhost:3001",
    registry: process.env.NEXT_PUBLIC_REGISTRY_URL ?? "http://localhost:3003",
} as const;
