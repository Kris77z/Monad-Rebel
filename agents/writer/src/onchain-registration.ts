import {
  type OnchainIdentityRecord,
  getOnchainIdentityRecord,
  registerAgentOnIdentityRegistry,
  setAgentWalletOnIdentityRegistry,
  upsertOnchainIdentityRecord
} from "@rebel/shared";
import { writerConfig } from "./config.js";

function getOnchainRegistrationKey(): string | undefined {
  if (!writerConfig.identity.onchain.registryAddress) {
    return undefined;
  }
  return [
    "writer",
    writerConfig.chainId.toString(10),
    writerConfig.identity.onchain.registryAddress.toLowerCase(),
    writerConfig.writerAddress.toLowerCase()
  ].join(":");
}

export async function getWriterOnChainRegistrationStatus(): Promise<{
  enabled: boolean;
  registryAddress?: string;
  agentUri?: string;
  registered: boolean;
  txHash?: string;
  agentTokenId?: string;
  walletBinding: {
    enabled: boolean;
    targetWallet?: string;
    configured: boolean;
    bound: boolean;
    txHash?: string;
    signatureProfileId?: string;
  };
}> {
  const walletTarget = writerConfig.identity.onchain.wallet.address;
  const key = getOnchainRegistrationKey();
  if (!key) {
    return {
      enabled: writerConfig.identity.onchain.enabled,
      registryAddress: writerConfig.identity.onchain.registryAddress,
      agentUri: writerConfig.identity.onchain.agentUri,
      registered: false,
      walletBinding: {
        enabled: writerConfig.identity.onchain.wallet.enabled,
        targetWallet: walletTarget,
        configured: Boolean(walletTarget),
        bound: false
      }
    };
  }
  const existing = await getOnchainIdentityRecord(key);
  return {
    enabled: writerConfig.identity.onchain.enabled,
    registryAddress: writerConfig.identity.onchain.registryAddress,
    agentUri: writerConfig.identity.onchain.agentUri,
    registered: Boolean(existing),
    txHash: existing?.txHash,
    agentTokenId: existing?.agentTokenId,
    walletBinding: {
      enabled: writerConfig.identity.onchain.wallet.enabled,
      targetWallet: walletTarget,
      configured: Boolean(walletTarget),
      bound: Boolean(
        walletTarget &&
          existing?.agentWalletAddress &&
          existing.agentWalletAddress.toLowerCase() === walletTarget.toLowerCase()
      ),
      txHash: existing?.agentWalletSetTxHash,
      signatureProfileId: existing?.agentWalletSignatureProfileId
    }
  };
}

async function maybeBindWriterAgentWallet(record: OnchainIdentityRecord): Promise<void> {
  const walletConfig = writerConfig.identity.onchain.wallet;
  if (!walletConfig.enabled) {
    return;
  }
  if (!record.agentTokenId) {
    console.warn("[writer] setAgentWallet skipped: missing on-chain agent token id");
    return;
  }
  if (!walletConfig.address) {
    console.warn("[writer] setAgentWallet skipped: WRITER_AGENT_WALLET_ADDRESS is missing/invalid");
    return;
  }
  try {
    const result = await setAgentWalletOnIdentityRegistry({
      rpcUrl: writerConfig.rpcUrl,
      chainId: writerConfig.chainId,
      ownerPrivateKey: writerConfig.writerPrivateKey,
      registryAddress: record.registryAddress,
      agentId: record.agentTokenId,
      newWalletAddress: walletConfig.address,
      newWalletSignerPrivateKey: walletConfig.signerPrivateKey,
      deadlineSeconds: walletConfig.deadlineSeconds,
      signatureProfile: {
        id: "writer-configured",
        domainName: walletConfig.signature.domainName,
        domainVersion: walletConfig.signature.domainVersion,
        typeName: walletConfig.signature.typeName,
        includeOwner: walletConfig.signature.includeOwner
      },
      allowLegacyFallback: walletConfig.signature.allowLegacyFallback
    });
    await upsertOnchainIdentityRecord({
      ...record,
      agentWalletAddress: result.targetWallet,
      agentWalletSetTxHash: result.txHash ?? record.agentWalletSetTxHash,
      agentWalletSetAt: result.txHash
        ? Math.floor(Date.now() / 1000)
        : (record.agentWalletSetAt ?? Math.floor(Date.now() / 1000)),
      agentWalletSetDeadline: result.deadline ?? record.agentWalletSetDeadline,
      agentWalletSignatureProfileId: result.profileId ?? record.agentWalletSignatureProfileId
    });
    if (result.skipped) {
      console.log(`[writer] setAgentWallet skipped: ${result.reason}`);
    } else {
      console.log(
        `[writer] on-chain agent wallet set | wallet=${result.targetWallet} | tx=${result.txHash} | profile=${result.profileId}`
      );
    }
  } catch (error) {
    console.error(
      `[writer] on-chain setAgentWallet failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export async function registerWriterIdentityOnChain(): Promise<void> {
  if (!writerConfig.identity.onchain.enabled) {
    return;
  }

  if (!writerConfig.identity.onchain.registryAddress) {
    console.warn("[writer] on-chain registration enabled but IDENTITY_REGISTRY_ADDRESS is missing");
    return;
  }

  const key = getOnchainRegistrationKey();
  if (!key) {
    return;
  }

  let record = await getOnchainIdentityRecord(key);
  if (record) {
    console.log(
      `[writer] on-chain identity already registered | tx=${record.txHash}${record.agentTokenId ? ` | agentId=${record.agentTokenId}` : ""}`
    );
  } else {
    try {
      const result = await registerAgentOnIdentityRegistry({
        rpcUrl: writerConfig.rpcUrl,
        chainId: writerConfig.chainId,
        privateKey: writerConfig.writerPrivateKey,
        registryAddress: writerConfig.identity.onchain.registryAddress,
        agentUri: writerConfig.identity.onchain.agentUri
      });
      record = {
        key,
        role: "writer",
        registryAddress: writerConfig.identity.onchain.registryAddress,
        chainId: writerConfig.chainId,
        walletAddress: writerConfig.writerAddress,
        agentUri: writerConfig.identity.onchain.agentUri,
        txHash: result.txHash,
        agentTokenId: result.agentId,
        registeredAt: Math.floor(Date.now() / 1000)
      };
      await upsertOnchainIdentityRecord(record);
      console.log(
        `[writer] on-chain identity registered | tx=${result.txHash}${result.agentId ? ` | agentId=${result.agentId}` : ""}`
      );
    } catch (error) {
      console.error(
        `[writer] on-chain registration failed: ${error instanceof Error ? error.message : String(error)}`
      );
      return;
    }
  }

  await maybeBindWriterAgentWallet(record);
}
