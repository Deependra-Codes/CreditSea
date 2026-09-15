import { createApp } from "./app";
import { connectDb } from "./lib/db";
import { env } from "./lib/env";

async function main() {
  await connectDb(env.MONGODB_URI);
  createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
