import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { CollectorResult } from "./collector.js";
import type {
  GameMetrics,
  TokenMetrics,
  RankingEntry,
  WeeklyHistory,
} from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, "..", "..");
const DATA_DIR = join(PROJECT_ROOT, "data", "onchain");
const CONFIG_FILE = join(PROJECT_ROOT, "config", "contracts.yaml");

const KNOWN_EXCHANGE_ADDRESSES = new Set([
  "0x75a6cfa1d08c40c2a0dde250a65e9b778e54a9e1", // OKX Kaia hot wallet
  "0xe93685f3bba03016f02bd1828badd6195988d950", // Binance Kaia
  "0x3b7dfd4d5b5af5c77c3eb3905e8cffd3d9e63c0e", // Gate.io Kaia
  "0xd6216fc19db775df9774a6e33526131da7d19a2c", // MEXC Kaia
  "0x4b1a99467a284cc690e3237bc69105956816f762", // Bithumb Kaia
  "0xa3a38d5c7b48167db3bfab75f51f31dc5b1c2b1a", // DragonSwap router (DEX)
  "0x5f0b1a82749cb4e2278ec87f8bf6b618dc71a8bf", // KLAYswap router (DEX)
]);

function formatTokenAmount(value: bigint, decimals: number): number {
  const divisor = 10n ** BigInt(decimals);
  const whole = value / divisor;
  const frac = value % divisor;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 4);
  return parseFloat(`${whole}.${fracStr}`);
}

export function computeMetrics(collected: CollectorResult[]): GameMetrics[] {
  const now = new Date().toISOString();

  return collected.map((game) => {
    const tokenMetrics: TokenMetrics[] = game.tokens.map((token) => {
      const transfers = token.transfers;

      const distributed = transfers
        .filter((t) => !KNOWN_EXCHANGE_ADDRESSES.has(t.from))
        .reduce((sum, t) => sum + t.value, 0n);
      const weeklyDistributed = formatTokenAmount(distributed, token.decimals);

      const wallets = new Set<string>();
      for (const t of transfers) {
        wallets.add(t.from);
        wallets.add(t.to);
      }
      wallets.delete("0x0000000000000000000000000000000000000000");
      const activeWallets = wallets.size;

      const walletAmounts = new Map<string, bigint>();
      for (const t of transfers) {
        const prev = walletAmounts.get(t.to) ?? 0n;
        walletAmounts.set(t.to, prev + t.value);
      }
      const sorted = [...walletAmounts.values()].sort((a, b) =>
        a > b ? -1 : a < b ? 1 : 0,
      );
      const top10Count = Math.max(1, Math.ceil(sorted.length * 0.1));
      const top10Sum = sorted.slice(0, top10Count).reduce((s, v) => s + v, 0n);
      const totalReceived = sorted.reduce((s, v) => s + v, 0n);
      const concentration =
        totalReceived > 0n
          ? parseFloat((Number(top10Sum) / Number(totalReceived)).toFixed(4))
          : 0;

      let exchangeAmount = 0n;
      let otherAmount = 0n;
      for (const t of transfers) {
        if (KNOWN_EXCHANGE_ADDRESSES.has(t.to)) {
          exchangeAmount += t.value;
        } else {
          otherAmount += t.value;
        }
      }

      const prevMetrics = loadPreviousMetrics(game.slug, token.symbol);
      let weeklyChangePct: number | null = null;
      if (prevMetrics !== null && prevMetrics > 0) {
        weeklyChangePct = parseFloat(
          (((weeklyDistributed - prevMetrics) / prevMetrics) * 100).toFixed(2),
        );
      }

      return {
        symbol: token.symbol,
        contract: token.contract,
        decimals: token.decimals,
        weekly_token_distributed: weeklyDistributed,
        active_wallets_7d: activeWallets,
        reward_concentration: concentration,
        weekly_change_pct: weeklyChangePct,
        token_flow: {
          exchange: formatTokenAmount(exchangeAmount, token.decimals),
          other: formatTokenAmount(otherAmount, token.decimals),
        },
      };
    });

    return {
      slug: game.slug,
      game_name: game.game_name,
      play_count: game.play_count,
      tokens: tokenMetrics,
      measured_at: now,
    };
  });
}

function loadPreviousMetrics(
  slug: string,
  symbol: string,
): number | null {
  const historyFile = join(DATA_DIR, "history", `${slug}.json`);
  if (!existsSync(historyFile)) return null;

  try {
    const data = JSON.parse(readFileSync(historyFile, "utf-8")) as WeeklyHistory;
    if (data.weeks.length < 1) return null;
    const lastWeek = data.weeks[data.weeks.length - 1];
    const tokenData = lastWeek.tokens.find((t) => t.symbol === symbol);
    return tokenData?.weekly_token_distributed ?? null;
  } catch {
    return null;
  }
}

export function buildRanking(
  metrics: GameMetrics[],
): RankingEntry[] {
  const offchainGames = loadOffchainGames();

  const onchainEntries: RankingEntry[] = metrics
    .map((m) => ({
      rank: 0,
      slug: m.slug,
      game_name: m.game_name,
      play_count: m.play_count,
      type: "onchain" as const,
      tokens: m.tokens.map((t) => ({
        symbol: t.symbol,
        weekly_token_distributed: t.weekly_token_distributed,
        active_wallets_7d: t.active_wallets_7d,
        weekly_change_pct: t.weekly_change_pct,
      })),
    }))
    .sort((a, b) => {
      const aTotal = a.tokens.reduce((s, t) => s + t.weekly_token_distributed, 0);
      const bTotal = b.tokens.reduce((s, t) => s + t.weekly_token_distributed, 0);
      return bTotal - aTotal;
    });

  onchainEntries.forEach((entry, i) => {
    entry.rank = i + 1;
  });

  const offchainEntries: RankingEntry[] = offchainGames.map((g) => ({
    rank: 0,
    slug: g.slug,
    game_name: g.name,
    play_count: g.play_count,
    type: "offchain",
    tokens: [],
  }));

  return [...onchainEntries, ...offchainEntries];
}

function loadOffchainGames(): { slug: string; name: string; play_count: string }[] {
  const raw = readFileSync(CONFIG_FILE, "utf-8");
  const games: { slug: string; name: string; play_count: string }[] = [];
  const lines = raw.split(/\r?\n/);

  let slug = "";
  let name = "";
  let playCount = "";
  let rewardType = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("- slug:")) {
      if (slug && rewardType === "offchain") {
        games.push({ slug, name, play_count: playCount });
      }
      slug = extractVal(trimmed, "slug");
      name = "";
      playCount = "";
      rewardType = "";
    } else if (trimmed.startsWith("name:")) name = extractVal(trimmed, "name");
    else if (trimmed.startsWith("play_count:"))
      playCount = extractVal(trimmed, "play_count");
    else if (trimmed.startsWith("reward_type:"))
      rewardType = extractVal(trimmed, "reward_type");
  }

  if (slug && rewardType === "offchain") {
    games.push({ slug, name, play_count: playCount });
  }

  return games;
}

function extractVal(line: string, key: string): string {
  const after = line.slice(line.indexOf(key + ":") + key.length + 1).trim();
  return after.replace(/^"|"$/g, "");
}

export function updateHistory(
  metrics: GameMetrics[],
): void {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  for (const game of metrics) {
    const historyFile = join(DATA_DIR, "history", `${game.slug}.json`);
    let history: WeeklyHistory;

    if (existsSync(historyFile)) {
      history = JSON.parse(readFileSync(historyFile, "utf-8")) as WeeklyHistory;
    } else {
      history = { slug: game.slug, weeks: [] };
    }

    history.weeks.push({
      week_start: weekStart.toISOString().split("T")[0],
      week_end: now.toISOString().split("T")[0],
      tokens: game.tokens.map((t) => ({
        symbol: t.symbol,
        weekly_token_distributed: t.weekly_token_distributed,
        active_wallets_7d: t.active_wallets_7d,
      })),
    });

    if (history.weeks.length > 52) {
      history.weeks = history.weeks.slice(-52);
    }

    writeFileSync(historyFile, JSON.stringify(history, null, 2), "utf-8");
  }
}
