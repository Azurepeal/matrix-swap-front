import { QueryFunctionContext } from 'react-query';

import Decimal from 'decimal.js';

import axiosInstance from 'src/config/axios';
import queryKeys from 'src/query-key';
import { ContextFromQueryKey } from 'src/query-key';
import { GetQuoteRequestParams, QuoteResponseDto } from 'src/types';
import { logger } from 'src/utils/logger';

const makeQuoteRequest = async (
  endpoint: string,
  queryParams: GetQuoteRequestParams | undefined,
) => {
  const { data } = await axiosInstance.post<QuoteResponseDto>(`${endpoint}/v1/quote/calculate`, {
    options: queryParams,
    metaData: 'string',
  });

  const { error, ts, ...result } = data;

  return result;
};
export const fetchQuote = async ({
  queryKey,
}: QueryFunctionContext<ReturnType<typeof queryKeys.quote.calculate>>): Promise<
  Omit<QuoteResponseDto, 'ts' | 'error'> | undefined
> => {
  const [_key, { endpoint, ...queryParams }] = queryKey;

  if (!queryParams || queryParams.amount === '0') return;

  return await makeQuoteRequest(endpoint, queryParams);
};

export const fetchQuoteCrossChain = async ({
  queryKey,
}: ContextFromQueryKey<typeof queryKeys.quote.axelar>) => {
  const [_key, { endpoints, ...queryParams }] = queryKey;

  const responses = await Promise.all(
    endpoints.map(x => {
      const { endpoint, from, to } = x;
      return makeQuoteRequest(endpoint, {
        ...queryParams,
        tokenInAddr: from,
        tokenOutAddr: to,
      });
    }),
  );

  logger.log(JSON.stringify(responses.map(x => x.dexAgg.expectedAmountOut)));

  const sorted = responses.sort((a, b) =>
    new Decimal(b.dexAgg.expectedAmountOut).comparedTo(a.dexAgg.expectedAmountOut),
  );

  return sorted[0];
};
