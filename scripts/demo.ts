const hunterUrl = process.env.HUNTER_URL ?? "http://localhost:3002";
const goal =
  process.env.DEMO_GOAL ??
  "Buy a concise but useful analysis on Monad performance and developer ergonomics.";

async function main(): Promise<void> {
  const response = await fetch(`${hunterUrl}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ goal })
  });

  const payload = await response.json();
  if (!response.ok) {
    console.error("[demo] failed:", payload);
    process.exit(1);
  }

  console.log("[demo] success");
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error("[demo] unexpected error:", error);
  process.exit(1);
});
