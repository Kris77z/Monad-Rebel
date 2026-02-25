import path from "node:path";
import { config as loadDotenv } from "dotenv";

loadDotenv({ path: path.resolve(process.env.INIT_CWD ?? process.cwd(), ".env") });

function mustNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number env: ${name}`);
  }
  return parsed;
}

export const registryConfig = {
  port: mustNumber("REGISTRY_PORT", 3003)
};

