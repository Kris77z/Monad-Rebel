import { ethers } from "ethers";
import type { Receipt } from "./types.js";

export function buildCaip2Network(chainId: number): string {
  return `eip155:${chainId}`;
}

export function calculateRequestHash(input: {
  taskType: string;
  taskInput: string;
  timestamp: number;
  providerAddress: string;
}): string {
  return ethers.keccak256(
    ethers.solidityPacked(
      ["string", "string", "uint256", "address"],
      [input.taskType, input.taskInput, BigInt(input.timestamp), input.providerAddress]
    )
  );
}

export function nowInSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export function calculateResultHash(result: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(result));
}

export function isHexTxHash(txHash: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(txHash);
}

export function sameAddress(a: string, b: string): boolean {
  return ethers.getAddress(a) === ethers.getAddress(b);
}

export function verifyReceiptSignature(receipt: Receipt): boolean {
  const recovered = ethers.verifyMessage(receipt.resultHash, receipt.signature);
  return sameAddress(recovered, receipt.provider);
}
