import type { NativeTransferAccept } from "@rebel/shared";
import { checkHunterBalance, makeNativePayment } from "../wallet.js";
import { HunterError } from "../errors.js";

export async function checkBalanceTool(): Promise<{
  address: string;
  wei: string;
  mon: string;
}> {
  return checkHunterBalance();
}

export async function makePaymentTool(accept: NativeTransferAccept): Promise<{
  txHash: string;
  from: string;
  to: string;
  amountWei: string;
}> {
  if (accept.scheme !== "native-transfer" || accept.asset !== "native") {
    throw new HunterError(422, "UNSUPPORTED_PAYMENT_SCHEME", "Only native-transfer/native is supported");
  }

  const balance = await checkHunterBalance();
  if (BigInt(balance.wei) < BigInt(accept.amount)) {
    throw new HunterError(422, "INSUFFICIENT_BALANCE", "Hunter wallet has insufficient MON balance", {
      balanceWei: balance.wei,
      requiredWei: accept.amount
    });
  }

  return makeNativePayment({
    to: accept.payTo,
    amountWei: accept.amount
  });
}
