import { atom } from 'jotai';
import _ from 'lodash-es';

import config from 'meta.config';
import { Chain, Token } from 'src/domain/chain/types';

import { tokenListMap } from '../chain/atom';

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
