import Decimal from 'decimal.js';
import { atom } from 'jotai';
import _ from 'lodash-es';

import config from 'meta.config';
import { Chain, Token } from 'src/domain/chain/types';
import { AxelarEndpoint } from 'src/query-key';

import { tokenListMap } from '../chain/atom';
import { tokenInAddressAtom, tokenInAmountAtom, tokenOutAddressAtom } from '../swap/atom';

export const fromChainAtom = atom<Chain>('BNB');

export const toChainAtom = atom<Chain>('polygon');

export const isCrossChainAtom = atom(false);

export const fromTokenEndpoint = atom<string>(get => {
  const chain = get(fromChainAtom);
  return config.chain.metaData[chain].apiEndpoint;
});

export const toTokenEndpoint = atom<string>(get => {
  const chain = get(toChainAtom);
  return config.chain.metaData[chain].apiEndpoint;
});

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
  // fromChain [tokenInAdress] fromSymbol -> [fromOutToken] toSymbol

  // toChain [?] -> [tokenOutAddress]
  const fromSymbol = get(fromTokenAtom)?.symbol;
  const toSymbol = get(toTokenAtom)?.symbol;

  const fromInToken = get(fromTokenAtom);
  const fromOutToken = get(fromTokenListAtom).find(x => x.symbol === toSymbol);
  const toInToken = get(toTokenListAtom).find(x => x.symbol === fromSymbol);
  const toOutToken = get(toTokenAtom);

  if (
    !fromSymbol ||
    !toSymbol ||
    !fromOutToken ||
    !toInToken ||
    !fromInToken ||
    !toInToken ||
    !toOutToken
  )
    return [];
  return [
    {
      chain: get(fromChainAtom),
      endpoint: get(fromTokenEndpoint),
      from: fromInToken.address,
      to: fromOutToken.address,
      amount: new Decimal(get(tokenInAmountAtom)).mul(Math.pow(10, fromInToken.decimals)).toFixed(),
      fromSymbol,
      toSymbol,
    },
    {
      chain: get(toChainAtom),
      endpoint: get(toTokenEndpoint),
      from: toInToken.address,
      to: toOutToken.address,
      amount: new Decimal(get(tokenInAmountAtom)).mul(Math.pow(10, toInToken.decimals)).toFixed(),
      fromSymbol,
      toSymbol,
    },
  ];
});
