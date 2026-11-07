import { icon, node } from "./ui.js";

export const COMPLETION_SNAPSHOT_FORMAT = "nightshift-completion-snapshot/v1";

export const SELECTORS = Object.freeze({
  publishCompletionReceipt: "0xe73f0920",
  getReceipt: "0xfcecbb61",
  computeReceiptId: "0x312c8f75",
  completionReceiptPublishedEvent:
    "0x0dcb55bbf2bc22c1e47ac0f377505e57ccf82857823c1c402fcbae10d71d6513",
});

export function canonicalJson(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => sortValue(item));
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([left], [right]) => left.localeCompare(right));
    return Object.fromEntries(entries.map(([key, entry]) => [key, sortValue(entry)]));
  }
  return value;
}

export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeBytes32(value) {
  const trimmed = String(value || "")
    .trim()
    .toLowerCase();
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-f]{64}$/.test(hex) || /^0{64}$/.test(hex)) {
    return null;
  }
  return `0x${hex}`;
}

export function normalizeAddress(value) {
  const trimmed = String(value || "")
    .trim()
    .toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(trimmed) || /^0x0{40}$/.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function encodePublishCalldata(snapshot) {
  const jobRef = normalizeBytes32(snapshot.job_reference_hash);
  const input = normalizeBytes32(snapshot.input_hash);
  const output = normalizeBytes32(snapshot.output_hash);
  const summary = normalizeBytes32(snapshot.recovery_summary_hash);
  if (!jobRef || !input || !output || !summary) {
    throw new Error("Completion snapshot contains malformed or empty fingerprints.");
  }
  return `${SELECTORS.publishCompletionReceipt}${jobRef.slice(2)}${input.slice(2)}${output.slice(2)}${summary.slice(2)}`;
}

export function encodeGetReceiptCalldata(receiptId) {
  const clean = normalizeBytes32(receiptId);
  if (!clean) {
    throw new Error("Enter a valid 32-byte receipt ID (0x…).");
  }
  return `${SELECTORS.getReceipt}${clean.slice(2)}`;
}

export function encodeComputeReceiptIdCalldata(publisher, snapshot) {
  const pub = normalizeAddress(publisher);
  const jobRef = normalizeBytes32(snapshot.job_reference_hash);
  const input = normalizeBytes32(snapshot.input_hash);
  const output = normalizeBytes32(snapshot.output_hash);
  const summary = normalizeBytes32(snapshot.recovery_summary_hash);
  if (!pub || !jobRef || !input || !output || !summary) {
    throw new Error("Invalid publisher address or snapshot hashes.");
  }
  return `${SELECTORS.computeReceiptId}${pub.slice(2).padStart(64, "0")}${jobRef.slice(2)}${input.slice(2)}${output.slice(2)}${summary.slice(2)}`;
}

export function decodeReceiptResponse(hexData) {
  const clean = String(hexData || "")
    .trim()
    .toLowerCase()
    .replace(/^0x/, "");
  if (clean.length < 64 * 6 || !/^[0-9a-f]+$/.test(clean)) {
    throw new Error("Receipt not found on BOT Chain.");
  }
  const word = (index) => clean.slice(index * 64, (index + 1) * 64);
  const publisher = `0x${word(0).slice(24)}`;
  const publishedAt = Number(BigInt(`0x${word(5)}`));
  if (!publishedAt || /^0x0{40}$/.test(publisher)) {
    throw new Error("Receipt not found on BOT Chain.");
  }
  return {
    publisher,
    job_reference_hash: `0x${word(1)}`,
    input_hash: `0x${word(2)}`,
    output_hash: `0x${word(3)}`,
    recovery_summary_hash: `0x${word(4)}`,
    published_at: publishedAt,
  };
}

export async function compareExportWithReceipt(exportedSnapshot, receipt) {
  if (
    !exportedSnapshot ||
    typeof exportedSnapshot !== "object" ||
    Array.isArray(exportedSnapshot)
  ) {
    throw new Error("Completion export must be a JSON object.");
  }
  if (exportedSnapshot.format !== COMPLETION_SNAPSHOT_FORMAT) {
    throw new Error(`Expected format ${COMPLETION_SNAPSHOT_FORMAT}.`);
  }
  if (
    typeof exportedSnapshot.job_reference !== "string" ||
    !/^nsref_v1_[0-9a-f]{32}$/.test(exportedSnapshot.job_reference)
  ) {
    throw new Error("Export job_reference is missing or invalid.");
  }
  if (!exportedSnapshot.report || typeof exportedSnapshot.report !== "object") {
    throw new Error("Export report summary is missing.");
  }
  if (!exportedSnapshot.recovery_summary || typeof exportedSnapshot.recovery_summary !== "object") {
    throw new Error("Export recovery_summary is missing.");
  }
  const computedJobRef = `0x${await sha256Hex(`nightshift-job-ref/v1:${exportedSnapshot.job_reference}`)}`;
  const computedInput = normalizeBytes32(exportedSnapshot.report.input_hash);
  const computedOutput = `0x${await sha256Hex(canonicalJson(exportedSnapshot.report))}`;
  const computedSummary = `0x${await sha256Hex(canonicalJson(exportedSnapshot.recovery_summary))}`;
  const mismatches = [];
  if (!computedInput) {
    mismatches.push("input_hash");
  }
  if (String(exportedSnapshot.job_reference_hash || "").toLowerCase() !== computedJobRef) {
    mismatches.push("snapshot_job_reference_hash");
  }
  if (computedInput && String(exportedSnapshot.input_hash || "").toLowerCase() !== computedInput) {
    mismatches.push("snapshot_input_hash");
  }
  if (String(exportedSnapshot.output_hash || "").toLowerCase() !== computedOutput) {
    mismatches.push("snapshot_output_hash");
  }
  if (String(exportedSnapshot.recovery_summary_hash || "").toLowerCase() !== computedSummary) {
    mismatches.push("snapshot_recovery_summary_hash");
  }
  if (receipt) {
    if (computedJobRef !== String(receipt.job_reference_hash || "").toLowerCase()) {
      mismatches.push("job_reference_hash");
    }
    if (computedInput !== String(receipt.input_hash || "").toLowerCase()) {
      mismatches.push("input_hash");
    }
    if (computedOutput !== String(receipt.output_hash || "").toLowerCase()) {
      mismatches.push("output_hash");
    }
    if (computedSummary !== String(receipt.recovery_summary_hash || "").toLowerCase()) {
      mismatches.push("recovery_summary_hash");
    }
  }
  return {
    valid: mismatches.length === 0,
    mismatches,
    computed: {
      job_reference_hash: computedJobRef,
      input_hash: computedInput || "",
      output_hash: computedOutput,
      recovery_summary_hash: computedSummary,
    },
  };
}

const walletState = {
  account: null,
  chainHex: null,
  snapshots: new Map(),
  receipts: new Map(),
};

function defaultBotChain(detail) {
  return (
    detail?.botchain || {
      chain_id: 677,
      chain_hex: "0x2a5",
      name: "BOT Chain Mainnet",
      rpc_url: "https://rpc.botchain.ai",
      explorer_url: "https://scan.botchain.ai",
      website_url: "https://botchain.ai",
      registry_address: null,
      native_currency: { name: "BOT", symbol: "BOT", decimals: 18 },
    }
  );
}

async function rpcCall(rpcUrl, method, params) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const payload = await response.json();
  if (payload.error) {
    throw new Error(payload.error.message || "BOT Chain RPC error.");
  }
  return payload.result;
}

export function renderReceiptSection(detail, jobId, api) {
  const section = node("section", "", "panel detail-panel receipt-panel");
  const botchain = defaultBotChain(detail);
  const head = node("div", "", "receipt-header");
  head.append(
    node("h2", "BOT Chain completion receipt"),
    node("span", `${botchain.name} (${botchain.chain_id})`, "badge"),
  );
  section.append(head);
  section.append(
    node(
      "p",
      "Publish a sanitized fingerprint of this verified report to BOT Chain, or compare a saved completion export against an on-chain receipt.",
      "muted",
    ),
  );
  const statusBox = node("div", "", "receipt-status");
  const snapshotBox = node("div", "", "receipt-snapshot");
  const walletBar = node("div", "", "actions receipt-actions");

  const prepareBtn = node("button", "Prepare completion snapshot", "secondary");
  prepareBtn.type = "button";
  prepareBtn.id = "prepare-snapshot";

  const exportBtn = node("button", "Download completion export", "secondary");
  exportBtn.type = "button";
  exportBtn.id = "download-snapshot";
  exportBtn.hidden = !walletState.snapshots.has(jobId);

  const connectBtn = node(
    "button",
    walletState.account
      ? `Connected: ${walletState.account.slice(0, 6)}…${walletState.account.slice(-4)}`
      : "Connect wallet",
    "secondary",
  );
  connectBtn.type = "button";
  connectBtn.id = "connect-wallet";

  const switchBtn = node("button", `Switch to ${botchain.name}`, "secondary");
  switchBtn.type = "button";
  switchBtn.id = "switch-botchain";
  switchBtn.hidden =
    !walletState.account ||
    walletState.chainHex?.toLowerCase() === botchain.chain_hex.toLowerCase();

  const publishBtn = node("button", "Publish Completion Receipt", "");
  publishBtn.type = "button";
  publishBtn.id = "publish-receipt";

  walletBar.append(prepareBtn, exportBtn, connectBtn, switchBtn, publishBtn);
  section.append(walletBar, statusBox, snapshotBox);

  function showMessage(text, isError = false) {
    statusBox.replaceChildren();
    const msg = node("p", text, isError ? "alert" : "muted");
    if (isError) msg.setAttribute("role", "alert");
    statusBox.append(msg);
  }

  function renderSnapshotPreview() {
    snapshotBox.replaceChildren();
    const current = walletState.snapshots.get(jobId);
    const published = walletState.receipts.get(jobId);
    const onBotChain =
      walletState.chainHex &&
      walletState.chainHex.toLowerCase() === botchain.chain_hex.toLowerCase();
    exportBtn.hidden = !current;
    switchBtn.hidden = !walletState.account || Boolean(onBotChain);
    publishBtn.disabled =
      !current || !walletState.account || !onBotChain || !botchain.registry_address;

    if (!current) {
      return;
    }
    const grid = node("dl", "", "hash-grid");
    for (const [label, value] of [
      ["Format", current.format],
      ["Job reference", current.job_reference],
      ["Job ref hash", current.job_reference_hash],
      ["Input hash", current.input_hash],
      ["Output hash", current.output_hash],
      ["Recovery summary hash", current.recovery_summary_hash],
    ]) {
      const row = node("div", "", "hash-row");
      row.append(node("dt", label), node("dd", value, "mono"));
      grid.append(row);
    }
    snapshotBox.append(grid);
    if (!botchain.registry_address) {
      snapshotBox.append(
        node(
          "p",
          "Registry contract address is not configured on this server yet. You can still download and verify completion exports.",
          "faint",
        ),
      );
    }
    if (published) {
      const box = node("div", "", "published-receipt");
      box.append(node("h3", "Published receipt"));
      if (published.receipt_id) {
        box.append(node("p", `Receipt ID: ${published.receipt_id}`, "mono faint"));
      }
      if (published.publisher) {
        box.append(node("p", `Publisher: ${published.publisher}`, "mono faint"));
      }
      if (published.tx_hash) {
        const link = node("a", `View transaction on BOTScan `, "text-link");
        link.href = `${botchain.explorer_url}/tx/${published.tx_hash}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.insertAdjacentHTML("beforeend", icon("external"));
        box.append(link);
      }
      snapshotBox.append(box);
    }
  }

  prepareBtn.addEventListener("click", async () => {
    prepareBtn.disabled = true;
    const response = await api(`/api/jobs/${jobId}/snapshot`);
    prepareBtn.disabled = false;
    if (!response || response.error || !response.snapshot) {
      showMessage(response?.message || "Could not prepare completion snapshot.", true);
      return;
    }
    walletState.snapshots.set(jobId, response.snapshot);
    showMessage(
      "Sanitized completion snapshot ready. Raw dataset rows and prompts stay off-chain.",
    );
    renderSnapshotPreview();
  });

  exportBtn.addEventListener("click", () => {
    const current = walletState.snapshots.get(jobId);
    if (!current) return;
    const published = walletState.receipts.get(jobId);
    const payload = published ? { ...current, receipt: published } : current;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${current.job_reference}.receipt.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  connectBtn.addEventListener("click", async () => {
    const provider = window.ethereum;
    if (!provider || typeof provider.request !== "function") {
      showMessage("No injected EVM wallet found. Install MetaMask or a BOT Chain wallet.", true);
      return;
    }
    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const account = Array.isArray(accounts) && accounts[0] ? String(accounts[0]) : null;
      if (!account) {
        showMessage("Wallet did not return an active account.", true);
        return;
      }
      const chainHex = await provider.request({ method: "eth_chainId" });
      walletState.account = account;
      walletState.chainHex = String(chainHex || "");
      connectBtn.textContent = `Connected: ${account.slice(0, 6)}…${account.slice(-4)}`;
      if (walletState.chainHex.toLowerCase() !== botchain.chain_hex.toLowerCase()) {
        showMessage(
          `Wallet connected on chain ${walletState.chainHex}. Switch to ${botchain.name} (${botchain.chain_id}) before publishing.`,
          true,
        );
      } else {
        showMessage(`Wallet connected on ${botchain.name}.`);
      }
      renderSnapshotPreview();
    } catch (error) {
      showMessage(error?.message || "Wallet connection was rejected.", true);
    }
  });

  switchBtn.addEventListener("click", async () => {
    const provider = window.ethereum;
    if (!provider || typeof provider.request !== "function") {
      showMessage("No injected EVM wallet found.", true);
      return;
    }
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: botchain.chain_hex }],
      });
    } catch (switchError) {
      if (switchError && switchError.code === 4902) {
        try {
          await provider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: botchain.chain_hex,
                chainName: botchain.name,
                nativeCurrency: botchain.native_currency,
                rpcUrls: [botchain.rpc_url],
                blockExplorerUrls: [botchain.explorer_url],
              },
            ],
          });
        } catch (addError) {
          showMessage(addError?.message || `Could not add ${botchain.name}.`, true);
          return;
        }
      } else {
        showMessage(switchError?.message || `Could not switch to ${botchain.name}.`, true);
        return;
      }
    }
    const chainHex = await provider.request({ method: "eth_chainId" });
    walletState.chainHex = String(chainHex || "");
    showMessage(`Switched to ${botchain.name} (${botchain.chain_id}).`);
    renderSnapshotPreview();
  });

  publishBtn.addEventListener("click", async () => {
    const current = walletState.snapshots.get(jobId);
    if (!current) {
      showMessage("Prepare the completion snapshot first.", true);
      return;
    }
    const provider = window.ethereum;
    if (!provider || !walletState.account) {
      showMessage("Connect your wallet first.", true);
      return;
    }
    const chainHex = String((await provider.request({ method: "eth_chainId" })) || "");
    walletState.chainHex = chainHex;
    if (chainHex.toLowerCase() !== botchain.chain_hex.toLowerCase()) {
      renderSnapshotPreview();
      showMessage(
        `Wrong network (${chainHex}). Switch to ${botchain.name} (${botchain.chain_id}) before publishing.`,
        true,
      );
      return;
    }
    if (!botchain.registry_address) {
      showMessage("Registry contract address is not configured.", true);
      return;
    }
    publishBtn.disabled = true;
    try {
      const data = encodePublishCalldata(current);
      let receiptId = null;
      try {
        const computed = await provider.request({
          method: "eth_call",
          params: [
            {
              to: botchain.registry_address,
              data: encodeComputeReceiptIdCalldata(walletState.account, current),
            },
            "latest",
          ],
        });
        receiptId = normalizeBytes32(computed);
      } catch {
        receiptId = null;
      }
      showMessage("Confirm the completion receipt publication in your wallet…");
      const txHash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: walletState.account,
            to: botchain.registry_address,
            data,
          },
        ],
      });
      walletState.receipts.set(jobId, {
        receipt_id: receiptId,
        publisher: walletState.account,
        tx_hash: String(txHash),
        chain_id: botchain.chain_id,
        registry_address: botchain.registry_address,
      });
      showMessage("Completion receipt transaction submitted to BOT Chain.");
      renderSnapshotPreview();
    } catch (error) {
      showMessage(error?.message || "Transaction failed or was rejected in the wallet.", true);
      publishBtn.disabled = false;
    }
  });

  section.append(renderLookupAndComparison(botchain));
  renderSnapshotPreview();
  return section;
}

function renderLookupAndComparison(botchain) {
  const wrap = document.createElement("details");
  wrap.className = "receipt-verify-details";
  const summary = node("summary", "Lookup receipt or compare completion export");
  summary.id = "receipt-verify-toggle";
  const body = node("div", "", "receipt-verify-body");

  body.innerHTML = `
    <div class="field">
      <label for="lookup-receipt-id">On-chain receipt ID (optional if comparing self-contained export)</label>
      <input id="lookup-receipt-id" type="text" class="mono" placeholder="0x…" spellcheck="false" />
    </div>
    <div class="field">
      <label for="compare-export-json">Completion snapshot export JSON</label>
      <textarea id="compare-export-json" rows="6" spellcheck="false" placeholder='{"format":"nightshift-completion-snapshot/v1", ...}'></textarea>
    </div>
    <div class="actions">
      <button type="button" class="secondary" id="lookup-onchain-btn">Lookup on-chain receipt</button>
      <button type="button" class="secondary" id="compare-export-btn">Compare export</button>
    </div>
    <div id="verify-receipt-output"></div>
  `;
  wrap.append(summary, body);

  const idInput = body.querySelector("#lookup-receipt-id");
  const jsonInput = body.querySelector("#compare-export-json");
  const output = body.querySelector("#verify-receipt-output");
  let loadedReceipt = null;

  function renderOutput(message, isError = false, details = null) {
    output.replaceChildren();
    const box = node("div", "", isError ? "alert" : "receipt-match-box");
    if (isError) box.setAttribute("role", "alert");
    box.append(node("p", message));
    if (details) {
      box.append(details);
    }
    output.append(box);
  }

  body.querySelector("#lookup-onchain-btn").addEventListener("click", async () => {
    const receiptId = normalizeBytes32(idInput.value);
    if (!receiptId) {
      renderOutput("Enter a valid 32-byte receipt ID (0x…).", true);
      return;
    }
    if (!botchain.registry_address) {
      renderOutput("Registry contract address is not configured on this server.", true);
      return;
    }
    try {
      const callData = encodeGetReceiptCalldata(receiptId);
      const raw = await rpcCall(botchain.rpc_url, "eth_call", [
        { to: botchain.registry_address, data: callData },
        "latest",
      ]);
      loadedReceipt = decodeReceiptResponse(raw);
      const dl = node("dl", "", "hash-grid");
      for (const [label, value] of [
        ["Publisher", loadedReceipt.publisher],
        ["Job ref hash", loadedReceipt.job_reference_hash],
        ["Input hash", loadedReceipt.input_hash],
        ["Output hash", loadedReceipt.output_hash],
        ["Recovery summary hash", loadedReceipt.recovery_summary_hash],
        ["Published at", new Date(loadedReceipt.published_at * 1000).toISOString()],
      ]) {
        const row = node("div", "", "hash-row");
        row.append(node("dt", label), node("dd", value, "mono"));
        dl.append(row);
      }
      renderOutput("On-chain receipt found on BOT Chain.", false, dl);
    } catch (error) {
      loadedReceipt = null;
      renderOutput(error?.message || "Could not look up receipt on BOT Chain.", true);
    }
  });

  body.querySelector("#compare-export-btn").addEventListener("click", async () => {
    let parsed;
    try {
      parsed = JSON.parse(jsonInput.value);
    } catch {
      renderOutput("Paste valid JSON from a completion export.", true);
      return;
    }
    try {
      const targetReceipt = loadedReceipt || parsed.onchain_receipt || null;
      const result = await compareExportWithReceipt(parsed, targetReceipt);
      if (!result.valid) {
        renderOutput(
          `Comparison failed. Mismatched fields: ${result.mismatches.join(", ")}.`,
          true,
        );
        return;
      }
      renderOutput(
        targetReceipt
          ? "Verified: export fingerprints match both the canonical payload and the on-chain receipt."
          : "Verified: export fingerprints match the canonical report and recovery summary payload.",
      );
    } catch (error) {
      renderOutput(error?.message || "Export comparison failed.", true);
    }
  });

  return wrap;
}
