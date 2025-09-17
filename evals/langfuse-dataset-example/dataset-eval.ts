import 'dotenv/config';
import { getLogger } from './logger.js';

const logger = getLogger('dataset-eval');

const BASE = process.env.LANGFUSE_BASE_URL!;
const PK = process.env.LANGFUSE_PUBLIC_KEY!;
const SK = process.env.LANGFUSE_SECRET_KEY!;
const DATASET_NAME = process.env.DATASET_NAME!;
const RUN_NAME = process.env.RUN_NAME!;
const SCORE_NAME = process.env.SCORE_NAME;
const SPAN_NAME = process.env.SPAN_NAME;
const TARGET_ATTRIBUTE = process.env.TARGET_ATTRIBUTE;

if (!BASE || !PK || !SK || !DATASET_NAME || !RUN_NAME) {
  throw new Error(
    "Missing env"
  );
}

function authHeaders(extra: Record<string, string> = {}) {
  return {
    Authorization: "Basic " + Buffer.from(`${PK}:${SK}`).toString("base64"),
    "Content-Type": "application/json",
    ...extra,
  };
}

async function ensureScoreConfig() {
  const resp = await fetch(`${BASE}/api/public/score-configs`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: SCORE_NAME,
      dataType: "NUMERIC",
      minValue: 0,
      maxValue: 1,
      description: `1 if trace contains span "${SPAN_NAME}" with ai.toolCall.name="${TARGET_ATTRIBUTE}", else 0`,
    }),
  });
  if (!resp.ok && resp.status !== 409) {
    throw new Error(`Score-config create failed: ${resp.status} ${await resp.text()}`);
  }
}

async function getDatasetIdByName(name: string): Promise<string> {
  const res = await fetch(`${BASE}/api/public/datasets/${encodeURIComponent(name)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Dataset lookup failed: ${res.status} ${await res.text()}`);
  const dataset = await res.json();
  return dataset.id as string;
}

async function* iterateRunItems(datasetId: string, runName: string) {
  let page = 1;
  while (true) {
    const url =
      `${BASE}/api/public/dataset-run-items` +
      `?datasetId=${encodeURIComponent(datasetId)}` +
      `&runName=${encodeURIComponent(runName)}` +
      `&page=${page}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error(`Fetch run items failed: ${res.status} ${await res.text()}`);
    const payload = (await res.json()) as {
      data: Array<{ id: string; datasetItemId: string; traceId?: string }>;
      meta?: { totalPages?: number };
    };

    const items = payload.data || [];
    if (items.length === 0) break;
    for (const it of items) yield it;

    const totalPages = payload.meta?.totalPages;
    if (typeof totalPages === "number" && page >= totalPages) break;
    page++;
  }
}

async function filterSpanObservations(traceId: string) {
  const res = await fetch(`${BASE}/api/public/traces/${encodeURIComponent(traceId)}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Fetch trace failed: ${res.status} ${await res.text()}`);
  const trace = await res.json();
  const observations = (trace.observations || []) as Array<{ name?: string; metadata?: any }>;
  return observations.filter((o) => o.name === SPAN_NAME);
}

function attributeUsed(observations: Array<{ metadata?: any }>): boolean {
  return observations.some(
    (o) => o?.metadata?.attributes?.["ai.toolCall.name"] === TARGET_ATTRIBUTE
  );
}

async function postScore(traceId: string, used: boolean) {
  const res = await fetch(`${BASE}/api/public/scores`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      name: SCORE_NAME,
      value: used ? 1 : 0,
      traceId,
      comment: used
        ? `Detected "${SPAN_NAME}" span with ai.toolCall.name="${TARGET_ATTRIBUTE}"`
        : `No "${SPAN_NAME}" span with ai.toolCall.name="${TARGET_ATTRIBUTE}"`,
    }),
  });
  if (!res.ok) throw new Error(`Post score failed: ${res.status} ${await res.text()}`);
}

async function main() {
  await ensureScoreConfig();

  const datasetId = await getDatasetIdByName(DATASET_NAME);
  logger.info(
    { datasetId, datasetName: DATASET_NAME, runName: RUN_NAME },
    `Scoring dataset run items for dataset "${DATASET_NAME}" (id=${datasetId}), runName="${RUN_NAME}"`
  );

  let total = 0;
  for await (const ri of iterateRunItems(datasetId, RUN_NAME)) {
    total++;
    logger.info(
      { runItemId: ri.id, datasetItemId: ri.datasetItemId },
      `Processing run item ${ri.id}`
    );

    if (!ri.traceId) {
      logger.warn(
        { runItemId: ri.id },
        "No linked trace for this run item. Skipping."
      );
      continue;
    }

    const observations = await filterSpanObservations(ri.traceId);
    const used = attributeUsed(observations);
    logger.info(
      { targetAttribute: TARGET_ATTRIBUTE, used, traceId: ri.traceId },
      `Tool usage check: "${TARGET_ATTRIBUTE}" used? ${used}`
    );

    await postScore(ri.traceId, used);
    logger.info(
      { scoreName: SCORE_NAME, scoreValue: used ? 1 : 0, traceId: ri.traceId },
      `Scored: ${SCORE_NAME}=${used ? 1 : 0}`
    );
  }

  logger.info(
    { totalProcessed: total },
    `Evaluation complete. Processed ${total} run items.`
  );
}

main().catch((e) => {
  logger.error(e, 'Dataset evaluation failed');
  process.exit(1);
});
