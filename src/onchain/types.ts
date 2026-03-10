export interface RpcEndpoint {
  url: string;
  label: string;
  priority: number;
}

export interface TokenTransfer {
  txHash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: bigint;
  tokenAddress: string;
  tokenSymbol: string;
  gameSlug: string;
}

export interface GameMetrics {
  slug: string;
  game_name: string;
  play_count: string;
  tokens: TokenMetrics[];
  measured_at: string;
}

export interface TokenMetrics {
  symbol: string;
  contract: string;
  decimals: number;
  weekly_token_distributed: number;
  active_wallets_7d: number;
  reward_concentration: number;
  weekly_change_pct: number | null;
  token_flow: {
    exchange: number;
    other: number;
  };
}

export interface WeeklyHistory {
  slug: string;
  weeks: {
    week_start: string;
    week_end: string;
    tokens: {
      symbol: string;
      weekly_token_distributed: number;
      active_wallets_7d: number;
    }[];
  }[];
}

export interface RankingEntry {
  rank: number;
  slug: string;
  game_name: string;
  play_count: string;
  type: "onchain" | "offchain";
  tokens: {
    symbol: string;
    weekly_token_distributed: number;
    active_wallets_7d: number;
    weekly_change_pct: number | null;
  }[];
}

export interface ContractGame {
  slug: string;
  name: string;
  play_count: string;
  reward_type: string;
  token_symbol: string;
  token_address: string;
  coingecko_id: string | null;
  additional_tokens?: {
    symbol: string;
    address: string;
    coingecko_id: string | null;
  }[];
}

export interface TokenEntry {
  game_name: string;
  apps_json_slug: string;
  symbol: string;
  name: string;
  decimals: number;
  kaia_contract: string;
  other_chains: Record<string, string>;
  coingecko_id: string | null;
  total_supply_snapshot: string | null;
  rpc_verified: boolean;
}
