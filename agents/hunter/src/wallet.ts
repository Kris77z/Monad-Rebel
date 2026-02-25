import { ethers } from "ethers";
import { hunterConfig } from "./config.js";
import { HunterError } from "./errors.js";

const provider = new ethers.JsonRpcProvider(hunterConfig.rpcUrl, hunterConfig.chainId);
const devWallet = ethers.Wallet.createRandom();

function getWallet(): ethers.HDNodeWallet | ethers.Wallet {
  if (hunterConfig.isMockMode) {
    return devWallet;
  }
  if (!hunterConfig.privateKey) {
    throw new HunterError(500, "WALLET_NOT_CONFIGURED", "HUNTER_PRIVATE_KEY is missing");
  }
  return new ethers.Wallet(hunterConfig.privateKey, provider);
}

export function getHunterAddress(): string {
  return getWallet().address;
}

export async function checkHunterBalance(): Promise<{
  address: string;
  wei: string;
  mon: string;
}> {
  const wallet = getWallet();
  if (hunterConfig.isMockMode) {
    const fakeWei = "100000000000000000000";
    return {
      address: wallet.address,
      wei: fakeWei,
      mon: ethers.formatEther(fakeWei)
    };
  }
  const balance = await provider.getBalance(wallet.address);
  return {
    address: wallet.address,
    wei: balance.toString(),
    mon: ethers.formatEther(balance)
  };
}

export async function makeNativePayment(input: {
  to: string;
  amountWei: string;
}): Promise<{
  txHash: string;
  from: string;
  to: string;
  amountWei: string;
}> {
  const wallet = getWallet();
  if (hunterConfig.isMockMode) {
    return {
      txHash: ethers.keccak256(
        ethers.toUtf8Bytes(
          `${wallet.address}:${input.to}:${input.amountWei}:${Date.now().toString(10)}`
        )
      ),
      from: wallet.address,
      to: input.to,
      amountWei: input.amountWei
    };
  }

  const tx = await wallet.sendTransaction({
    to: input.to,
    value: BigInt(input.amountWei)
  });
  await tx.wait(1);

  return {
    txHash: tx.hash,
    from: wallet.address,
    to: input.to,
    amountWei: input.amountWei
  };
}
