import assert from "node:assert/strict";
import test from "node:test";
import { isNightshiftError } from "../src/errors.js";
import { assertTransition } from "../src/constants.js";

test("job transitions allow recovery and reject terminal repairs", () => {
  assert.doesNotThrow(() => assertTransition("queued", "running"));
  assert.doesNotThrow(() => assertTransition("running", "stalled"));
  assert.doesNotThrow(() => assertTransition("stalled", "recovering"));
  assert.doesNotThrow(() => assertTransition("recovering", "verifying"));
  assert.doesNotThrow(() => assertTransition("verifying", "completed"));
  assert.throws(
    () => assertTransition("completed", "running"),
    (error: unknown) => isNightshiftError(error) && error.code === "illegal_transition",
  );
  assert.throws(
    () => assertTransition("escalated", "recovering"),
    (error: unknown) => isNightshiftError(error) && error.code === "illegal_transition",
  );
});
