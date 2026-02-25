import { ethers } from "ethers";
import { isHexTxHash, sameAddress } from "@rebel/shared";
import { WriterError } from "./errors.js";
import { writerConfig } from "./config.js";

const provider = new ethers.JsonRpcProvider(writerConfig.rpcUrl, writerConfig.chainId);
const pendingPaymentTxs = new Set<string>();
const usedPaymentTxs = new Set<string>();

function reservePaymentTx(txHash: string): void {
  const normalized = txHash.toLowerCase();
  if (usedPaymentTxs.has(normalized) || pendingPaymentTxs.has(normalized)) {
    throw new WriterError(409, "DUPLICATE_NONCE", `Payment transaction already used: ${txHash}`);
  }
  pendingPaymentTxs.add(normalized);
}

function releasePaymentTx(txHash: string): void {
  pendingPaymentTxs.delete(txHash.toLowerCase());
}

function markPaymentUsed(txHash: string): void {
  const normalized = txHash.toLowerCase();
  pendingPaymentTxs.delete(normalized);
  usedPaymentTxs.add(normalized);
}

export interface VerifiedPayment {
  txHash: string;
  amount: bigint;
  from: string;
  to: string;
}

export async function verifyNativeTransfer(txHash: string): Promise<VerifiedPayment> {
  if (!isHexTxHash(txHash)) {
    throw new WriterError(400, "INVALID_PAYLOAD", "paymentTx must be a valid 32-byte transaction hash");
  }

  reservePaymentTx(txHash);
  try {
    if (writerConfig.skipPaymentVerification) {
      return {
        txHash,
        amount: BigInt(writerConfig.priceWei),
        from: ethers.ZeroAddress,
        to: writerConfig.writerAddress
      };
    }

    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      throw new WriterError(422, "SETTLEMENT_FAILED", "Transaction not found or not successful");
    }

    const tx = await provider.getTransaction(txHash);
    if (!tx || !tx.to) {
      throw new WriterError(422, "SETTLEMENT_FAILED", "Transaction details not available");
    }

    if (!sameAddress(tx.to, writerConfig.writerAddress)) {
      throw new WriterError(422, "RECIPIENT_MISMATCH", "Transaction recipient does not match writer");
    }

    const expected = BigInt(writerConfig.priceWei);
    if (tx.value < expected) {
      throw new WriterError(422, "INVALID_AMOUNT", "Transaction value is lower than required price", {
        expected: expected.toString(),
        received: tx.value.toString()
      });
    }

    return {
      txHash,
      amount: tx.value,
      from: tx.from,
      to: tx.to
    };
  } catch (error) {
    releasePaymentTx(txHash);
    if (error instanceof WriterError) {
      throw error;
    }
    throw new WriterError(500, "SETTLEMENT_FAILED", "Failed to verify payment transaction", {
      cause: error instanceof Error ? error.message : String(error)
    });
  }
}

export function commitPaymentTx(txHash: string): void {
  markPaymentUsed(txHash);
}

export function rollbackPaymentTx(txHash: string): void {
  releasePaymentTx(txHash);
}
