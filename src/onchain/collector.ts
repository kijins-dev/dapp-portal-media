import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getBlockNumber,
  getTransferLogs,
  parseTransferLog,
  BLOCKS_PER_WEEK,
} from "./rpc-client.js";
import type {
  ContractGame,
  TokenEntry,
  TokenTransfer,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const CONFIG_FILE = join(PROJECT_ROOT, "config", "contracts.yaml");
const TOKENS_FILE = join(PROJECT_ROOT, "data", "tokens.json");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function parseContractsYaml(): ContractGame[] {
  const raw = readFileSync(CONFIG_FILE, "utf-8");
  const games: ContractGame[] = [];
  const lines = raw.split(/\r?\n/);

  let current: Partial<ContractGame> | null = null;
  let inAdditional = false;
  let additionalToken: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- slug:")) {
      if (current?.slug && current.reward_type === "kip7") {
        games.push(current as ContractGame);
      }
      current = {};
      inAdditional = false;
      current.slug = extractYamlValue(trimmed, "slug");
    } else if (current) {
      if (trimmed.startsWith("name:")) current.name = extractYamlValue(trimmed, "name");
      else if (trimmed.startsWith("play_count:"))
        current.play_count = extractYamlValue(trimmed, "play_count");
      else if (trimmed.startsWith("reward_type:"))
        current.reward_type = extractYamlValue(trimmed, "reward_type");
      else if (trimmed.startsWith("token_symbol:"))
        current.token_symbol = extractYamlValue(trimmed, "token_symbol");
      else if (trimmed.startsWith("token_address:"))
        current.token_address = extractYamlValue(trimmed, "token_address");
      else if (trimmed.startsWith("coingecko_id:")) {
        const val = extractYamlValue(trimmed, "coingecko_id");
        current.coingecko_id = val === "null" ? null : val;
      } else if (trimmed === "additional_tokens:") {
        inAdditional = true;
        current.additional_tokens = [];
      } else if (inAdditional) {
        if (trimmed.startsWith("- symbol:")) {
          if (additionalToken.symbol) {
            current.additional_tokens!.push({
              symbol: additionalToken.symbol,
              address: additionalToken.address,
              coingecko_id:
                additionalToken.coingecko_id === "null"
                  ? null
                  : additionalToken.coingecko_id || null,
            });
          }
          additionalToken = { symbol: extractYamlValue(trimmed, "symbol") };
        } else if (trimmed.startsWith("address:")) {
          additionalToken.address = extractYamlValue(trimmed, "address");
        } else if (trimmed.startsWith("coingecko_id:")) {
          additionalToken.coingecko_id = extractYamlValue(trimmed, "coingecko_id");
        }
      }
    }
  }

  if (current?.slug && current.reward_type === "kip7") {
    if (inAdditional && additionalToken.symbol) {
      current.additional_tokens = current.additional_tokens || [];
      current.additional_tokens.push({
        symbol: additionalToken.symbol,
        address: additionalToken.address,
        coingecko_id:
          additionalToken.coingecko_id === "null"
            ? null
            : additionalToken.coingecko_id || null,
      });
    }
    games.push(current as ContractGame);
  }

  return games;
}

function extractYamlValue(line: string, key: string): string {
  const after = line.slice(line.indexOf(key + ":") + key.length + 1).trim();
  return after.replace(/^"|"$/g, "");
}

function loadTokensJson(): TokenEntry[] {
  const raw = readFileSync(TOKENS_FILE, "utf-8");
  const data = JSON.parse(raw) as { tokens: TokenEntry[] };
  return data.tokens;
}

export interface CollectorResult {
  slug: string;
  game_name: string;
  play_count: string;
  tokens: {
    symbol: string;
    contract: string;
    decimals: number;
    transfers: TokenTransfer[];
  }[];
}

export async function collectAll(): Promise<CollectorResult[]> {
  const games = parseContractsYaml();
  const tokenRegistry = loadTokensJson();
  const latestBlock = await getBlockNumber();
  const fromBlock = latestBlock - BLOCKS_PER_WEEK;

  console.log(
    `  Block range: ${fromBlock} → ${latestBlock} (${BLOCKS_PER_WEEK} blocks ≈ 7 days)`,
  );

  const results: CollectorResult[] = [];

  for (const game of games) {
    console.log(`\n  [${game.name}]`);

    const tokensToCollect: { symbol: string; address: string }[] = [
      { symbol: game.token_symbol, address: game.token_address },
    ];

    if (game.additional_tokens) {
      for (const t of game.additional_tokens) {
        tokensToCollect.push({ symbol: t.symbol, address: t.address });
      }
    }

    const collectedTokens: CollectorResult["tokens"] = [];

    for (const { symbol, address } of tokensToCollect) {
      const registryEntry = tokenRegistry.find(
        (t) => t.kaia_contract.toLowerCase() === address.toLowerCase(),
      );
      const decimals = registryEntry?.decimals ?? 18;

      console.log(`    ${symbol} (${address.slice(0, 10)}...)`);

      try {
        const logs = await getTransferLogs(address, fromBlock, latestBlock);
        console.log(`    → ${logs.length} Transfer events`);

        const transfers: TokenTransfer[] = logs
          .map((log) => {
            const parsed = parseTransferLog(log);
            return {
              ...parsed,
              tokenAddress: address.toLowerCase(),
              tokenSymbol: symbol,
              gameSlug: game.slug,
            };
          })
          .filter((t) => t.from !== ZERO_ADDRESS || t.to !== ZERO_ADDRESS);

        collectedTokens.push({
          symbol,
          contract: address.toLowerCase(),
          decimals,
          transfers,
        });
      } catch (err) {
        console.error(
          `    ✗ Failed: ${err instanceof Error ? err.message : String(err)}`,
        );
        collectedTokens.push({
          symbol,
          contract: address.toLowerCase(),
          decimals,
          transfers: [],
        });
      }
    }

    results.push({
      slug: game.slug,
      game_name: game.name,
      play_count: game.play_count,
      tokens: collectedTokens,
    });
  }

  return results;
}
