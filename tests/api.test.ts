import assert from "node:assert/strict";
import type { IncomingMessage, ServerResponse } from "node:http";
import test from "node:test";
import handler from "../api/index.js";

test("the hosted entry refuses a missing database without exposing configuration", async () => {
  const originalUrl = process.env.TURSO_DATABASE_URL;
  const originalToken = process.env.TURSO_AUTH_TOKEN;
  delete process.env.TURSO_DATABASE_URL;
  delete process.env.TURSO_AUTH_TOKEN;
  let status = 0;
  let body = "";
  const response = {
    headersSent: false,
    writeHead(value: number) {
      status = value;
    },
    end(value: string) {
      body = value;
    },
  } as unknown as ServerResponse;
  try {
    await handler({ url: "/api/session", method: "POST" } as IncomingMessage, response);
    assert.equal(status, 503);
    assert.deepEqual(JSON.parse(body), {
      error: "service_unavailable",
      message: "Nightshift could not complete this request.",
    });
    assert.doesNotMatch(body, /token|libsql|TURSO|stack/i);
  } finally {
    if (originalUrl !== undefined) process.env.TURSO_DATABASE_URL = originalUrl;
    if (originalToken !== undefined) process.env.TURSO_AUTH_TOKEN = originalToken;
  }
});
