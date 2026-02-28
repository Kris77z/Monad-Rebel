import express from "express";
import type { ErrorResponse, HunterRunRequestMode } from "@rebel/shared";
import { hunterConfig } from "./config.js";
import { asHunterError } from "./errors.js";
import { getHunterIdentity } from "./identity.js";
import {
  getHunterOnChainRegistrationStatus,
  registerHunterIdentityOnChain
} from "./onchain-registration.js";
import { runHunter, type HunterTraceEvent } from "./react-engine.js";
import { checkHunterBalance, getHunterAddress } from "./wallet.js";

const app = express();

// CORS: allow frontend direct connection (bypass Next.js rewrite buffering for SSE)
app.use((_req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (_req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());

function writeSseEvent(
  res: express.Response,
  event: "trace" | "done" | "error" | "ready",
  payload: unknown
): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function parseRunMode(raw: unknown): HunterRunRequestMode {
  return raw === "commander" ? "commander" : "single";
}

async function streamRun(req: express.Request, res: express.Response): Promise<void> {
  const body = req.body as { goal?: string; mode?: HunterRunRequestMode } | undefined;
  const queryGoal = typeof req.query.goal === "string" ? req.query.goal : undefined;
  const queryMode = typeof req.query.mode === "string" ? req.query.mode : undefined;
  const goal = body?.goal?.trim() || queryGoal?.trim() || hunterConfig.defaultGoal;
  const requestMode = parseRunMode(body?.mode ?? queryMode);

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  let closed = false;
  const controller = new AbortController();
  const heartbeat = setInterval(() => {
    if (!closed && !res.writableEnded) {
      res.write(": ping\n\n");
    }
  }, 15000);

  res.on("close", () => {
    closed = true;
    if (!controller.signal.aborted) {
      controller.abort("client_disconnected");
    }
    clearInterval(heartbeat);
  });

  writeSseEvent(res, "ready", {
    mode: hunterConfig.useReact ? "react" : "scripted",
    agentMode: hunterConfig.useReact ? "react" : "scripted",
    requestMode,
    goal
  });

  try {
    const result = await runHunter(goal, {
      onEvent: (event: HunterTraceEvent) => {
        if (closed || res.writableEnded) {
          return;
        }
        writeSseEvent(res, "trace", event);
      },
      signal: controller.signal
    }, requestMode);

    if (!closed && !res.writableEnded) {
      writeSseEvent(res, "done", result);
    }
  } catch (error) {
    const hunterError = asHunterError(error);
    const payload: ErrorResponse = {
      code: hunterError.code,
      message: hunterError.message,
      details: hunterError.details
    };
    if (!closed && !res.writableEnded) {
      writeSseEvent(res, "error", payload);
    }
  } finally {
    clearInterval(heartbeat);
    if (!closed && !res.writableEnded) {
      res.end();
    }
  }
}

app.get("/health", (_req, res) => {
  let address: string | undefined;
  try {
    address = getHunterAddress();
  } catch {
    address = undefined;
  }

  res.status(200).json({
    status: "ok",
    service: "hunter",
    chainId: hunterConfig.chainId,
    mode: hunterConfig.useReact ? "react" : "scripted",
    paymentMode: hunterConfig.isMockMode ? "mock" : "chain",
    address,
    agentId: getHunterIdentity().agentId
  });
});

app.get("/identity", async (_req, res) => {
  try {
    const [onchain, balance] = await Promise.all([
      getHunterOnChainRegistrationStatus(),
      checkHunterBalance(),
    ]);
    res.status(200).json({
      identity: getHunterIdentity(),
      onchain,
      balance: { wei: balance.wei, mon: balance.mon },
    });
  } catch (error) {
    res.status(500).json({
      code: "IDENTITY_READ_FAILED",
      message: error instanceof Error ? error.message : "Failed to load identity"
    });
  }
});

app.post("/run", async (req, res) => {
  try {
    const body = req.body as { goal?: string; mode?: HunterRunRequestMode } | undefined;
    const goal = body?.goal?.trim() || hunterConfig.defaultGoal;
    const requestMode = parseRunMode(body?.mode);
    const result = await runHunter(goal, {}, requestMode);
    res.status(200).json(result);
  } catch (error) {
    const hunterError = asHunterError(error);
    const payload: ErrorResponse = {
      code: hunterError.code,
      message: hunterError.message,
      details: hunterError.details
    };
    res.status(hunterError.status).json(payload);
  }
});

app.post("/run/stream", async (req, res) => {
  await streamRun(req, res);
});

app.get("/run/stream", async (req, res) => {
  await streamRun(req, res);
});

app.listen(hunterConfig.port, () => {
  void registerHunterIdentityOnChain();
  console.log(
    `[hunter] running on :${hunterConfig.port} | mode=${hunterConfig.useReact ? "react" : "scripted"} | payment=${hunterConfig.isMockMode ? "mock" : "chain"} | llm=${hunterConfig.llm.provider}:${hunterConfig.llm.model}`
  );
});
