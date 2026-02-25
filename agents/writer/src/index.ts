import express from "express";
import { getFeedbackStoreReputation, listFeedbackStoreEntries } from "@rebel/shared";
import { writerConfig } from "./config.js";
import { advertiseWriterCapabilities } from "./advertise.js";
import { getWriterIdentity, getWriterServiceInfo, getWriterServicesInfo } from "./identity.js";
import { getWriterOnchainReputation } from "./onchain-reputation.js";
import {
  getWriterOnChainRegistrationStatus,
  registerWriterIdentityOnChain
} from "./onchain-registration.js";
import { executeHandler } from "./routes.js";

const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.use(express.json());

app.post("/execute", (req, res) => {
  void executeHandler(req, res);
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "writer",
    chainId: writerConfig.chainId,
    writerAddress: writerConfig.writerAddress,
    serviceCount: getWriterServicesInfo().length,
    agentId: getWriterIdentity().agentId
  });
});

app.get("/identity", async (_req, res) => {
  try {
    const onchain = await getWriterOnChainRegistrationStatus();
    res.status(200).json({
      identity: getWriterIdentity(),
      service: getWriterServiceInfo(),
      services: getWriterServicesInfo(),
      onchain
    });
  } catch (error) {
    res.status(500).json({
      code: "IDENTITY_READ_FAILED",
      message: error instanceof Error ? error.message : "Failed to load identity"
    });
  }
});

app.get("/feedback", async (_req, res) => {
  try {
    const identity = getWriterIdentity();
    const entries = await listFeedbackStoreEntries(identity.agentId);
    res.status(200).json({
      agentId: identity.agentId,
      count: entries.length,
      feedback: entries
    });
  } catch (error) {
    res.status(500).json({
      code: "FEEDBACK_READ_FAILED",
      message: error instanceof Error ? error.message : "Failed to load feedback"
    });
  }
});

app.get("/feedback/:agentId", async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const entries = await listFeedbackStoreEntries(agentId);
    res.status(200).json({
      agentId,
      count: entries.length,
      feedback: entries
    });
  } catch (error) {
    res.status(500).json({
      code: "FEEDBACK_READ_FAILED",
      message: error instanceof Error ? error.message : "Failed to load feedback"
    });
  }
});

app.get("/reputation", async (_req, res) => {
  try {
    const identity = getWriterIdentity();
    const [reputation, onchain] = await Promise.all([
      getFeedbackStoreReputation(identity.agentId),
      getWriterOnchainReputation().catch(() => ({
        enabled: writerConfig.reputation.onchain.enabled,
        available: false as const,
        reason: "onchain read failed"
      }))
    ]);
    res.status(200).json({
      agentId: identity.agentId,
      ...reputation,
      onchain
    });
  } catch (error) {
    res.status(500).json({
      code: "REPUTATION_READ_FAILED",
      message: error instanceof Error ? error.message : "Failed to load reputation"
    });
  }
});

app.get("/reputation/:agentId", async (req, res) => {
  try {
    const agentId = req.params.agentId;
    const reputation = await getFeedbackStoreReputation(agentId);
    res.status(200).json({
      agentId,
      ...reputation
    });
  } catch (error) {
    res.status(500).json({
      code: "REPUTATION_READ_FAILED",
      message: error instanceof Error ? error.message : "Failed to load reputation"
    });
  }
});

app.listen(writerConfig.port, () => {
  void advertiseWriterCapabilities().catch((error) => {
    console.error(
      `[writer] capability advertise failed: ${error instanceof Error ? error.message : String(error)}`
    );
  });
  const heartbeat = setInterval(() => {
    void advertiseWriterCapabilities({ silent: true });
  }, writerConfig.discovery.heartbeatIntervalMs);
  heartbeat.unref?.();
  void registerWriterIdentityOnChain();
  console.log(
    `[writer] running on :${writerConfig.port} | mode=${writerConfig.isMockMode ? "mock" : "chain"} | llm=${writerConfig.llm.provider}:${writerConfig.llm.model}`
  );
});
