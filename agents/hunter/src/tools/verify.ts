import { verifyReceiptSignature, type Receipt } from "@rebel/shared";

export function verifyReceiptTool(receipt: Receipt): {
  isValid: boolean;
  provider: string;
} {
  const isValid = verifyReceiptSignature(receipt);
  return {
    isValid,
    provider: receipt.provider
  };
}

export function evaluateResultTool(result: string): {
  score: number;
  summary: string;
} {
  const length = result.trim().length;
  if (length > 600) {
    return { score: 9, summary: "Detailed and high-signal output." };
  }
  if (length > 200) {
    return { score: 7, summary: "Reasonable detail for MVP task." };
  }
  return { score: 5, summary: "Result is short; could be expanded." };
}
