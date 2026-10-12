import { icon } from "./ui.js";

// Frozen values from evidence/runs/failed-ack-live.json; never session or live data.
export const RECORDED_RECOVERY = Object.freeze({
  jobId: "job_96c4b30c-5b0a-4af7-af43-94d907a512e9",
  rows: 5,
  minutes: 120,
  modelCalls: 8,
  source:
    "https://github.com/Ololadestephen/nightshift/blob/main/evidence/runs/failed-ack-live.json",
});

export function renderLanding(main) {
  main.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="release-pill"><span class="status-dot"></span> AI operations for report jobs</p>
        <h1>Pick up where<br>work stopped.</h1>
        <p class="hero-description">Nightshift investigates stalled report jobs, resumes from saved checkpoints, and checks the report against its original input.</p>
        <div class="hero-actions"><a class="button" href="#/desk">Open workspace ${icon("arrow")}</a><a class="text-link" href="https://github.com/Ololadestephen/nightshift/tree/main/evidence" target="_blank" rel="noopener noreferrer">View recovery evidence ${icon("external")}</a></div>
        <p class="hero-footnote">Application-owned reports. Repairs bounded by policy.</p>
      </div>
      <div class="recovery-visual" aria-label="Recorded controlled Sonnet recovery, not a live or session report.">
        <div class="visual-top"><span>${icon("activity")} Recovery record</span><span>Recorded Sonnet run</span></div>
        <div class="snapshot-job"><p class="mono">${RECORDED_RECOVERY.jobId.slice(0, 16)}…</p><h2>Queue activity report</h2></div>
        <ol class="recovery-route">
          <li data-state="complete"><span class="route-icon">${icon("check")}</span><div><strong>Parsed work saved</strong><span>The original checkpoint is preserved.</span></div></li>
          <li data-state="uncertain"><span class="route-icon">${icon("clock")}</span><div><strong>Resume acknowledgement lost</strong><span>Read the new checkpoint before acting again.</span></div></li>
          <li data-state="complete"><span class="route-icon">${icon("shield")}</span><div><strong>Existing report verified</strong><span>One artifact. No repeated resume.</span></div></li>
        </ol>
        <div class="artifact-receipt"><div class="receipt-heading"><span>${icon("report")} Report reconciled</span><span class="receipt-state">${icon("check")} Verified</span></div><dl><div><dt>Rows</dt><dd>${RECORDED_RECOVERY.rows}</dd></div><div><dt>Total minutes</dt><dd>${RECORDED_RECOVERY.minutes}</dd></div><div><dt>Mismatches</dt><dd>None</dd></div></dl><p>Totals from the original dataset.</p></div>
        <div class="visual-bottom"><span>Controlled demonstration · ${RECORDED_RECOVERY.modelCalls} model calls</span><a href="${RECORDED_RECOVERY.source}" target="_blank" rel="noopener noreferrer">Inspect record ${icon("external")}</a></div>
      </div>
    </section>
    <div class="principle-strip"><span>Completion is more than a restart.</span><span>${icon("shield")} Policy before action</span><span>${icon("clock")} Durable checkpoints</span><span>${icon("check")} Artifact verification</span></div>
    <section class="workflow-section" id="how-it-works">
      <div class="section-intro"><p class="eyebrow">From interruption to completion</p><h2>A second chance.<br>Not a blind restart.</h2><p>Every repair follows the evidence. Every result is checked against the original input.</p></div>
      <div class="workflow-steps">
        <article><span class="step-number">01</span><div><h3>Understand the interruption</h3><p>Inspect the job, worker lease, saved checkpoints and recent errors before choosing a next step.</p></div>${icon("search")}</article>
        <article><span class="step-number">02</span><div><h3>Continue the unfinished work</h3><p>Reclaim an expired lease within policy. Resume from the last saved step and preserve completed work.</p></div>${icon("activity")}</article>
        <article><span class="step-number">03</span><div><h3>Check the actual deliverable</h3><p>Reconcile the report’s identity, input hash, row counts and totals. Resolve with proof, or escalate with evidence.</p></div>${icon("shield")}</article>
      </div>
    </section>
    <section class="proof-section" id="safety">
      <div class="proof-preview"><div class="proof-caption">The verification contract ${icon("shield")}</div><div class="proof-title">A file exists.<br>But is it the right file?</div><ul><li>${icon("check")} Original input fingerprint</li><li>${icon("check")} Job and pipeline identity</li><li>${icon("check")} Row counts and minute totals</li><li>${icon("check")} Stored artifact reconciliation</li></ul><div class="proof-note">Checks before completion</div></div>
      <div class="proof-copy"><p class="eyebrow">Trust the outcome</p><h2>Nothing is complete<br>until it checks out.</h2><p>A running worker doesn’t prove the report is right. Nightshift verifies the deliverable, preserves the recovery record and makes uncertainty visible.</p><div class="boundary"><span>${icon("shield")}</span><div><h3>Small scope. Clear boundaries.</h3><p>One controlled report pipeline. Allowlisted repairs. Active workers stay protected. Unsupported conditions escalate.</p></div></div><a class="text-link" href="#/settings">Explore the environment ${icon("arrow")}</a></div>
    </section>
    <section class="integration-section" id="evidence"><div><p class="eyebrow">A record behind the result</p><h2>Keep the work inspectable.</h2></div><div class="integration-grid"><article><h3>${icon("activity")} neatlogs</h3><p>Agent and tool traces, with export status visible on each run.</p></article><article><h3>${icon("code")} Entire</h3><p>Repository context and coding checkpoints, separate from runtime recovery.</p></article><article><h3>${icon("report")} cfo.ai</h3><p>The business model, with forecasts clearly labelled as assumptions.</p></article></div></section>
    <section class="closing-cta"><div><p class="eyebrow">Give unfinished work a way forward</p><h2>Take the next shift.</h2></div><a class="button" href="#/desk">Open workspace ${icon("arrow")}</a></section>
    <footer class="site-footer"><a class="brand" href="#/">${icon("moon", "brand-icon")} Nightshift<span class="brand-period">.</span></a><p>Unfinished work, handled.</p><a href="https://github.com/Ololadestephen/nightshift" target="_blank" rel="noopener noreferrer">View source ${icon("external")}</a><span>Built for neatHack 2026</span></footer>
  `;
}
