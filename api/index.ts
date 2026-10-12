import type { IncomingMessage, ServerResponse } from "node:http";
import { waitUntil } from "@vercel/functions";
import { handle } from "../src/app/server.js";
import { systemClock } from "../src/clock.js";
import type { Database } from "../src/database-port.js";
import { openRemoteDatabase } from "../src/remote-database.js";

let connection: Promise<Database> | undefined;

function database(): Promise<Database> {
  connection ??= openRemoteDatabase(process.env).catch((error: unknown) => {
    connection = undefined;
    throw error;
  });
  return connection;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  try {
    await handle(
      request,
      response,
      {
        database: await database(),
        clock: systemClock,
        artifactDir: "/tmp/nightshift/artifacts",
        journalDir: "/tmp/nightshift/traces",
        env: { ...process.env, VERCEL: "1", NIGHTSHIFT_COOKIE_SECURE: "1" },
        defer: waitUntil,
      },
      false,
    );
  } catch {
    if (!response.headersSent) {
      response.writeHead(503, { "content-type": "application/json", "cache-control": "no-store" });
      response.end(
        JSON.stringify({
          error: "service_unavailable",
          message: "Nightshift could not complete this request.",
        }),
      );
    }
  }
}
