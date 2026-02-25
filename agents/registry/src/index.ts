import express from "express";
import {
  appendServiceFeedbackEntry,
  enrichServicesWithReputation,
  getServiceReputation,
  listDynamicServices,
  registerDynamicService,
  registerAgentIdentity,
  listAgentIdentities,
  type ServiceInfo,
  type AgentIdentity
} from "@rebel/shared";
import { registryConfig } from "./config.js";

const app = express();

// CORS: allow frontend direct connection
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

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "registry"
  });
});

/* ─── Service endpoints ─── */

app.get("/services", async (_req, res) => {
  try {
    const services = await listDynamicServices();
    const withReputation = await enrichServicesWithReputation(services);
    res.status(200).json({ services: withReputation });
  } catch (error) {
    res.status(500).json({
      code: "REGISTRY_LIST_FAILED",
      message: error instanceof Error ? error.message : "Failed to list services"
    });
  }
});

app.post("/services/register", async (req, res) => {
  try {
    const body = req.body as {
      agentId?: string;
      service?: ServiceInfo;
      ttlSeconds?: number;
    };

    if (!body?.agentId || !body?.service) {
      res.status(400).json({
        code: "INVALID_PAYLOAD",
        message: "agentId and service are required"
      });
      return;
    }

    await registerDynamicService({
      agentId: body.agentId,
      service: body.service,
      ttlSeconds: typeof body.ttlSeconds === "number" ? body.ttlSeconds : undefined
    });

    res.status(200).json({
      status: "ok",
      serviceId: body.service.id
    });
  } catch (error) {
    res.status(500).json({
      code: "REGISTRY_REGISTER_FAILED",
      message: error instanceof Error ? error.message : "Failed to register service"
    });
  }
});

app.post("/services/:serviceId/feedback", async (req, res) => {
  try {
    const serviceId = req.params.serviceId?.trim();
    const body = req.body as {
      hunterId?: string;
      missionId?: string;
      score?: number;
      taskType?: string;
      comment?: string;
      timestamp?: number;
    };

    if (!serviceId) {
      res.status(400).json({
        code: "INVALID_SERVICE_ID",
        message: "serviceId is required"
      });
      return;
    }

    if (
      !body?.hunterId ||
      !body?.missionId ||
      typeof body.score !== "number" ||
      !Number.isFinite(body.score)
    ) {
      res.status(400).json({
        code: "INVALID_PAYLOAD",
        message: "hunterId, missionId and numeric score are required"
      });
      return;
    }

    const dynamicServices = await listDynamicServices();
    const serviceExists = dynamicServices.some((item) => item.id === serviceId);
    if (!serviceExists) {
      res.status(404).json({
        code: "SERVICE_NOT_FOUND",
        message: `Service not found: ${serviceId}`
      });
      return;
    }

    const entry = await appendServiceFeedbackEntry({
      serviceId,
      hunterId: body.hunterId,
      missionId: body.missionId,
      score: body.score,
      taskType: body.taskType ?? "unknown",
      comment: body.comment,
      timestamp: typeof body.timestamp === "number" ? body.timestamp : undefined
    });
    const reputation = await getServiceReputation(serviceId);

    res.status(200).json({
      status: "ok",
      serviceId,
      feedback: entry,
      reputation
    });
  } catch (error) {
    res.status(500).json({
      code: "SERVICE_FEEDBACK_FAILED",
      message: error instanceof Error ? error.message : "Failed to submit service feedback"
    });
  }
});

/* ─── Agent identity endpoints (Level 1 — in-memory) ─── */

app.post("/agents/register", (req, res) => {
  try {
    const body = req.body as Partial<AgentIdentity> | undefined;

    if (!body?.name?.trim() || !body?.walletAddress?.trim()) {
      res.status(400).json({
        code: "INVALID_PAYLOAD",
        message: "name and walletAddress are required"
      });
      return;
    }

    const identity: AgentIdentity = {
      agentId: body.agentId ?? `user:${body.walletAddress.toLowerCase()}`,
      name: body.name.trim(),
      description: body.description?.trim() ?? "",
      image: body.image,
      walletAddress: body.walletAddress,
      capabilities: body.capabilities ?? [],
      trustModels: body.trustModels ?? ["reputation"],
      active: true,
      registeredAt: Math.floor(Date.now() / 1000)
    };

    const registered = registerAgentIdentity(identity);
    res.status(200).json({ status: "ok", identity: registered });
  } catch (error) {
    res.status(500).json({
      code: "AGENT_REGISTER_FAILED",
      message: error instanceof Error ? error.message : "Failed to register agent"
    });
  }
});

app.get("/agents", (_req, res) => {
  try {
    const activeOnly = _req.query.active === "true";
    const agents = listAgentIdentities({ activeOnly });
    res.status(200).json({ agents, count: agents.length });
  } catch (error) {
    res.status(500).json({
      code: "AGENT_LIST_FAILED",
      message: error instanceof Error ? error.message : "Failed to list agents"
    });
  }
});

app.listen(registryConfig.port, () => {
  console.log(`[registry] running on :${registryConfig.port}`);
});
