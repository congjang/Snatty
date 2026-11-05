#!/usr/bin/env node
/**
 * One-shot smoke test for snatty-api (requires Docker Postgres + `npm run dev`).
 *
 *   cd server && docker compose up -d && cp -n .env.example .env && npx prisma db push && npm run dev
 *   # other terminal:
 *   npm run smoke
 *
 * Env:
 *   SMOKE_BASE_URL — default http://127.0.0.1:4000
 *   SMOKE_DEV_EMAIL — default smoke-test@local.invalid
 */

const base = process.env.SMOKE_BASE_URL ?? "http://127.0.0.1:4000";
const email = process.env.SMOKE_DEV_EMAIL ?? "smoke-test@local.invalid";

async function req(method, path, { headers = {}, body } = {}) {
  const url = `${base.replace(/\/$/, "")}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      ...headers,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  console.log(`Smoke test → ${base}`);

  const h = await req("GET", "/health");
  if (!h.ok || h.json?.ok !== true) {
    console.error("FAIL /health", h.status, h.json);
    process.exit(1);
  }
  console.log("OK /health");

  const db = await req("GET", "/health/db");
  if (!db.ok || db.json?.db !== "up") {
    console.error(
      "FAIL /health/db (is Postgres up? `docker compose up -d` + `npx prisma db push`)",
      db.status,
      db.json,
    );
    process.exit(1);
  }
  console.log("OK /health/db");

  const payload = {
    body: `smoke ${new Date().toISOString()}`,
    emotionTagIds: [],
    source: "app",
  };

  const r = await req("POST", "/v1/entries/quick", {
    headers: { "X-Dev-Email": email },
    body: payload,
  });

  if (!r.ok || !r.json?.entry?.id) {
    console.error("FAIL POST /v1/entries/quick", r.status, r.json);
    process.exit(1);
  }
  console.log("OK POST /v1/entries/quick", r.json.entry.id);
  console.log("Smoke test passed.");
}

main().catch((err) => {
  if (err?.cause?.code === "ECONNREFUSED" || err?.code === "ECONNREFUSED") {
    console.error(
      "Connection refused. Start the API: `cd server && docker compose up -d && npm run dev`",
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
