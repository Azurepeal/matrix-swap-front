import { QueryFunctionContext } from 'react-query';

import axiosInstance from 'src/config/axios';
import queryKeys from 'src/query-key';
import { QuoteResponseDto } from 'src/types';

export const fetchQuote = async ({
  queryKey,
}: QueryFunctionContext<ReturnType<typeof queryKeys.quote.calculate>>): Promise<
  Omit<QuoteResponseDto, 'ts' | 'error'> | undefined
> => {
  const [_key, { endpoint, ...queryParams }] = queryKey;

  if (!queryParams || queryParams.amount === '0') return;

  // axelar
  if (endpoint === undefined) {
  }

  const { data } = await axiosInstance.post<QuoteResponseDto>(`${endpoint}/v1/quote/calculate`, {
    options: queryParams,
    metaData: 'string',
  });

  const { error, ts, ...result } = data;

  return result;
};
