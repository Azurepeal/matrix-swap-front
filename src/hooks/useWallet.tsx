import { useCallback, useEffect } from 'react';

import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';

import config from 'meta.config';
import { keyMap } from 'src/constant/storage-key';
import { chainAtom } from 'src/domain/chain/atom';
import { fromChainAtom } from 'src/domain/cross-chain/atom';
import { balanceFetchKey } from 'src/domain/swap/atom';
import { TransactionParams, WalletExtensionFactory, WALLET_TYPES } from 'src/utils/wallet';

interface WalletState {
  type?: ValueOf<typeof WALLET_TYPES>;
  address?: string;
  requestedWalletType?: ValueOf<typeof WALLET_TYPES>;
}

const initialWalletState: WalletState = {
  type: undefined,
  address: undefined,
};

export const wallStateAtom = atom(initialWalletState);

const CONNECT_WALLET_ACTION = '@wallet/connect';
interface ConnectWalletAction {
  type: typeof CONNECT_WALLET_ACTION;
  payload: {
    requestedWalletType: ValueOf<typeof WALLET_TYPES>;
  };
}

const CONNECT_WALLET_SUCCESS_ACTION = '@wallet/connect-success';
interface ConnectWalletSuccessAction {
  type: typeof CONNECT_WALLET_SUCCESS_ACTION;
  payload: WalletState;
}

/**
 * TODO: local storage에서 remove,
 * state에서 type, address 비우기
 */
const DISCONNECT_WALLET_ACTION = '@wallet/disconnect';
interface DisconnectWalletAction {
  type: typeof DISCONNECT_WALLET_ACTION;
}

type WalletAction = ConnectWalletAction | ConnectWalletSuccessAction | DisconnectWalletAction;

const walletReducer = (state = initialWalletState, action: WalletAction): WalletState => {
  switch (action.type) {
    case CONNECT_WALLET_ACTION:
      return {
        ...state,
        requestedWalletType: action.payload.requestedWalletType,
      };
    case CONNECT_WALLET_SUCCESS_ACTION:
      return { ...action.payload, requestedWalletType: undefined };
    case DISCONNECT_WALLET_ACTION:
      return initialWalletState;
    default:
      return state;
  }
};

export const wallReducerAtom = atomWithReducer(initialWalletState, walletReducer);

export const useWallet = () => {
  const [state, dispatch] = useAtom(wallReducerAtom);
  const updateFetchKey = useSetAtom(balanceFetchKey);
  const chain = useAtomValue(chainAtom);
  const fromChain = useAtomValue(fromChainAtom);

  const connect = useCallback(
    async (requestWalletType: ValueOf<typeof WALLET_TYPES>) => {
      const walletExtensionFactory = new WalletExtensionFactory(requestWalletType);
      const walletExtension = walletExtensionFactory.createWalletExtension();
      if (!walletExtension) return null;

      // select "fromChain" if axelar mode;

      const targetChain = chain in config.chain.metaData ? chain : fromChain;

      const res = await walletExtension?.connect(targetChain);

      if (!res) return null;

      dispatch({ type: CONNECT_WALLET_SUCCESS_ACTION, payload: res });
      updateFetchKey(+new Date());

      if (typeof window.localStorage === undefined) return null;
      localStorage.setItem(keyMap.LAST_CONNECTED_WALLET_TYPE, res.type);

      return res;
    },
    [dispatch, chain],
  );

  const disconnect = useCallback(() => {
    dispatch({ type: DISCONNECT_WALLET_ACTION });
    if (typeof window.localStorage === undefined) return;
    localStorage.removeItem(keyMap.LAST_CONNECTED_WALLET_TYPE);
  }, [state]);

  const getBalance = useCallback(async () => {
    if (!state.type || !state.address) return;

    const walletExtensionFactory = new WalletExtensionFactory(state.type);
    const walletExtension = walletExtensionFactory.createWalletExtension();

    if (!walletExtension) return;

    return walletExtension.getBalance(state.address);
  }, [state.type, state.address]);

  const sendTransaction = useCallback(
    (params: TransactionParams) => {
      if (!state.type || !state.address) return;

      const walletExtensionFactory = new WalletExtensionFactory(state.type);
      const walletExtension = walletExtensionFactory.createWalletExtension();

      if (!walletExtension) return;

      return walletExtension.sendTransaction({
        ...params,
        // maxPriorityFeePerGas: new Decimal('1.5e9').toHexadecimal(),
        // maxFeePerGas: new Decimal('2.75e10').toHexadecimal(),
      });
    },
    [state.address, state.type],
  );

  useEffect(() => {
    if (typeof window.localStorage === undefined) return;
    const lastConnectedWalletType = localStorage.getItem(keyMap.LAST_CONNECTED_WALLET_TYPE);

    if (!lastConnectedWalletType) return;
    connect(lastConnectedWalletType as ValueOf<typeof WALLET_TYPES>);
  }, []);

  return { ...state, connect, disconnect, getBalance, sendTransaction };
};
