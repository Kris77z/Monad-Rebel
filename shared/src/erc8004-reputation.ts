import { ethers } from "ethers";

const REPUTATION_REGISTRY_ABI = [
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external",
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals)"
];

function toInt128(value: number): bigint {
  const min = -(2n ** 127n);
  const max = 2n ** 127n - 1n;
  const asBigInt = BigInt(Math.trunc(value));
  if (asBigInt < min || asBigInt > max) {
    throw new Error("value out of int128 range");
  }
  return asBigInt;
}

export async function giveOnchainFeedback(input: {
  rpcUrl: string;
  chainId: number;
  privateKey: string;
  reputationRegistryAddress: string;
  agentTokenId: string;
  value: number;
  valueDecimals?: number;
  tag1?: string;
  tag2?: string;
  endpoint?: string;
  feedbackUri?: string;
  feedbackHash?: string;
}): Promise<{
  txHash: string;
}> {
  const provider = new ethers.JsonRpcProvider(input.rpcUrl, input.chainId);
  const wallet = new ethers.Wallet(input.privateKey, provider);
  const registry = new ethers.Contract(
    input.reputationRegistryAddress,
    REPUTATION_REGISTRY_ABI,
    wallet
  );

  const tx = await registry.giveFeedback(
    BigInt(input.agentTokenId),
    toInt128(input.value),
    input.valueDecimals ?? 0,
    input.tag1 ?? "",
    input.tag2 ?? "",
    input.endpoint ?? "",
    input.feedbackUri ?? "",
    input.feedbackHash ?? ethers.ZeroHash
  );
  await tx.wait(1);
  return { txHash: tx.hash };
}

export async function readOnchainReputationSummary(input: {
  rpcUrl: string;
  chainId: number;
  reputationRegistryAddress: string;
  agentTokenId: string;
  tag1?: string;
  tag2?: string;
}): Promise<{
  count: number;
  summaryValue: string;
  summaryValueDecimals: number;
  average: number;
}> {
  const provider = new ethers.JsonRpcProvider(input.rpcUrl, input.chainId);
  const registry = new ethers.Contract(input.reputationRegistryAddress, REPUTATION_REGISTRY_ABI, provider);
  const result = (await registry.getSummary(
    BigInt(input.agentTokenId),
    [],
    input.tag1 ?? "",
    input.tag2 ?? ""
  )) as [bigint, bigint, bigint | number];

  const count = Number(result[0]);
  const summaryValue = result[1].toString();
  const summaryValueDecimals = Number(result[2]);
  const aggregate = Number(ethers.formatUnits(result[1], summaryValueDecimals));
  const average = count > 0 ? aggregate / count : 0;

  return {
    count,
    summaryValue,
    summaryValueDecimals,
    average: Number(average.toFixed(4))
  };
}
