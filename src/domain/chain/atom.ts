import { atom } from 'jotai';

import config from 'meta.config';
import bscTokenListJson from 'src/constant/token-list/bsc.json';
import polygonTokenListJson from 'src/constant/token-list/polygon.json';

import { Chain, Token } from './types';

export const tokenListMap: Record<Chain, Token[]> = {
  polygon: polygonTokenListJson.result,
  BNB: bscTokenListJson.result,
};

export const chainList: Chain[] = config.chain.chainList;

export const defaultChain: Chain = config.chain.defaultChain;

export const defaultTokenList: Token[] = tokenListMap[defaultChain];

export const chainAtom = atom<Chain>(defaultChain);

export const tokenListAtom = atom<Token[]>(get => {
  const chain = get(chainAtom);
  return tokenListMap[chain];
});
