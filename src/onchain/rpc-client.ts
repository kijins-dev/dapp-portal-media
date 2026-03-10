import type { RpcEndpoint } from "./types.js";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const KAIA_BLOCK_TIME_MS = 1000;
const BLOCKS_PER_WEEK = Math.ceil((7 * 24 * 60 * 60 * 1000) / KAIA_BLOCK_TIME_MS);
const MAX_LOGS_CHUNK = 10_000;
const RATE_LIMIT_MS = 500;

let lastCallAt = 0;

function getEndpoints(): RpcEndpoint[] {
  const endpoints: RpcEndpoint[] = [
    {
      url: "https://public-en.node.kaia.io",
      label: "Kaia Public",
      priority: 1,
    },
  ];

  const quicknode = process.env.QUICKNODE_RPC_URL;
  if (quicknode) {
    endpoints.push({
      url: quicknode,
      label: "QuickNode",
      priority: 2,
    });
  }

  return endpoints.sort((a, b) => a.priority - b.priority);
}

async function rateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallAt;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_MS - elapsed));
  }
  lastCallAt = Date.now();
}

async function jsonRpc(
  endpoint: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  await rateLimit();

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`RPC HTTP ${res.status}: ${await res.text()}`);
  }

  const json = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (json.error) {
    throw new Error(`RPC error: ${json.error.message}`);
  }

  return json.result;
}

let activeEndpoint: string | null = null;

async function getEndpoint(): Promise<string> {
  if (activeEndpoint) return activeEndpoint;

  for (const ep of getEndpoints()) {
    try {
      const start = Date.now();
      await jsonRpc(ep.url, "eth_blockNumber", []);
      const elapsed = Date.now() - start;
      if (elapsed < 1000) {
        activeEndpoint = ep.url;
        console.log(`  RPC: ${ep.label} (${elapsed}ms)`);
        return ep.url;
      }
      console.log(`  RPC: ${ep.label} too slow (${elapsed}ms), trying next...`);
    } catch {
      console.log(`  RPC: ${ep.label} failed, trying next...`);
    }
  }

  const fallback = getEndpoints()[0].url;
  activeEndpoint = fallback;
  console.log(`  RPC: falling back to ${fallback}`);
  return fallback;
}

export async function getBlockNumber(): Promise<number> {
  const ep = await getEndpoint();
  const hex = (await jsonRpc(ep, "eth_blockNumber", [])) as string;
  return parseInt(hex, 16);
}

export async function ethCall(to: string, data: string): Promise<string> {
  const ep = await getEndpoint();
  return (await jsonRpc(ep, "eth_call", [{ to, data }, "latest"])) as string;
}

interface LogEntry {
  transactionHash: string;
  blockNumber: string;
  topics: string[];
  data: string;
}

export async function getTransferLogs(
  tokenAddress: string,
  fromBlock: number,
  toBlock: number,
): Promise<LogEntry[]> {
  const ep = await getEndpoint();
  const allLogs: LogEntry[] = [];

  const estimatedBlocks = toBlock - fromBlock;
  const chunkSize = Math.min(
    estimatedBlocks,
    Math.floor((MAX_LOGS_CHUNK / estimatedBlocks) * estimatedBlocks) || estimatedBlocks,
  );
  const weekChunk = Math.floor(BLOCKS_PER_WEEK / 7);
  const safeChunk = Math.min(chunkSize, weekChunk);

  let current = fromBlock;
  while (current <= toBlock) {
    const end = Math.min(current + safeChunk - 1, toBlock);
    try {
      const logs = (await jsonRpc(ep, "eth_getLogs", [
        {
          address: tokenAddress,
          topics: [TRANSFER_TOPIC],
          fromBlock: `0x${current.toString(16)}`,
          toBlock: `0x${end.toString(16)}`,
        },
      ])) as LogEntry[];
      allLogs.push(...logs);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("exceed") || msg.includes("limit")) {
        const mid = Math.floor((current + end) / 2);
        if (mid === current) {
          console.warn(`  Skipping block ${current}: log limit exceeded`);
          current = end + 1;
          continue;
        }
        const first = await getTransferLogs(tokenAddress, current, mid);
        const second = await getTransferLogs(tokenAddress, mid + 1, end);
        allLogs.push(...first, ...second);
      } else {
        throw err;
      }
    }
    current = end + 1;
  }

  return allLogs;
}

export function parseTransferLog(log: LogEntry): {
  txHash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: bigint;
} {
  return {
    txHash: log.transactionHash,
    blockNumber: parseInt(log.blockNumber, 16),
    from: "0x" + log.topics[1].slice(26).toLowerCase(),
    to: "0x" + log.topics[2].slice(26).toLowerCase(),
    value: BigInt(log.data),
  };
}

export { BLOCKS_PER_WEEK, TRANSFER_TOPIC };

export function resetEndpoint(): void {
  activeEndpoint = null;
}
