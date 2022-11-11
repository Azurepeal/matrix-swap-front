import { QueryFunctionContext } from '@tanstack/query-core';

import { GetQuoteRequestParams } from './types';

type CoinId = 'usd-coin';
type TargetCurrency = 'krw' | 'usd';

export type ContextFromQueryKey<QueryKeyFunc extends (...args: any[]) => readonly any[]> =
  QueryFunctionContext<ReturnType<QueryKeyFunc>>;

const queryKeys = {
  balance: {
    metaMask: (address: string | undefined, balanceFetchKey: number) =>
      ['metamask', { address, balanceFetchKey }] as const,
    byAddress: (endpoint: string, address?: string) => ['balance', { endpoint, address }] as const,
  },
  currency: {
    byCoinId: (coinId: CoinId, targetCurrency: TargetCurrency) =>
      ['currency', { coinId, targetCurrency }] as const,
  },
  quote: {
    calculate: (endpoint: string | undefined, params: GetQuoteRequestParams | undefined) =>
      ['quote', { ...params, endpoint }] as const,
  },
};

export default queryKeys;
