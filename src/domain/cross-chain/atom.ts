import { atom } from 'jotai';
import _ from 'lodash-es';

import config from 'meta.config';
import { Chain, Token } from 'src/domain/chain/types';
import { AxelarEndpoint } from 'src/query-key';

import { tokenListMap } from '../chain/atom';
import { tokenInAddressAtom, tokenOutAddressAtom } from '../swap/atom';

export const fromChainAtom = atom<Chain>('BNB');

export const toChainAtom = atom<Chain>('polygon');

export const isCrossChainAtom = atom(false);

export const fromTokenListAtom = atom<Token[]>(get => {
  return _.intersectionBy(
    tokenListMap[get(fromChainAtom)],
    tokenListMap[get(toChainAtom)],
    'symbol',
  );
});

export const toTokenListAtom = atom<Token[]>(get => {
  return _.intersectionBy(
    tokenListMap[get(toChainAtom)],
    tokenListMap[get(fromChainAtom)],
    'symbol',
  );
});

export const fromTokenEndpoint = atom<string>(get => {
  const chain = get(fromChainAtom);
  return config.chain.metaData[chain].apiEndpoint;
});

export const toTokenEndpoint = atom<string>(get => {
  const chain = get(toChainAtom);
  return config.chain.metaData[chain].apiEndpoint;
});

export const fromTokenAtom = atom<Token | undefined>(get => {
  if (!get(tokenInAddressAtom)) {
    return undefined;
  }

  const tokenList = get(fromTokenListAtom);
  const result = tokenList.find(x => x.address === get(tokenInAddressAtom));

  if (!result) {
    return tokenList[0];
  }

  return result;
});

export const toTokenAtom = atom<Token | undefined>(get => {
  if (!get(tokenOutAddressAtom)) {
    return undefined;
  }

  const tokenList = get(toTokenListAtom);
  const result = tokenList.find(({ address }) => address === get(tokenOutAddressAtom));

  if (!result) {
    return tokenList[1];
  }

  return result;
});

export const crossChainSwapEndpointsAtom = atom<AxelarEndpoint[]>(get => {
  // fromChain [tokenInAdress] -> [?]
  // toChain [?] -> [tokenOutAddress]
  const fromSymbol = get(fromTokenAtom)?.symbol;
  const toSymbol = get(toTokenAtom)?.symbol;

  if (!fromSymbol || !toSymbol) return [];
  return [
    {
      endpoint: get(fromTokenEndpoint),
      from: get(tokenInAddressAtom) ?? '',
      to: get(fromTokenListAtom).find(x => x.symbol === toSymbol)?.address ?? '',
    },
    {
      endpoint: get(toTokenEndpoint),
      from: get(toTokenListAtom).find(x => x.symbol === fromSymbol)?.address ?? '',
      to: get(tokenOutAddressAtom) ?? '',
    },
  ];
});
