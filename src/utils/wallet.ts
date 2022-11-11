import config from 'meta.config';
import { Chain } from 'src/domain/chain/types';

import { logger } from './logger';

export const WALLET_TYPES = {
  METAMASK: 'metamask' as const,
};

export interface Wallet {
  type: ValueOf<typeof WALLET_TYPES>;
  address: string;
}

// const transactionParameters = {
//   nonce: '0x00', // ignored by MetaMask
//   gasPrice: '0x09184e72a000', // customizable by user during MetaMask confirmation.
//   gas: '0x2710', // customizable by user during MetaMask confirmation.
//   to: '0x0000000000000000000000000000000000000000', // Required except during contract publications.
//   from: ethereum.selectedAddress, // must match user's active address.
//   value: '0x00', // Only required to send ether to the recipient from the initiating external account.
//   data:
//     '0x7f7465737432000000000000000000000000000000000000000000000000000000600057', // Optional, but used for defining smart contract creation and interaction.
//   chainId: '0x3', // Used to prevent transaction reuse across blockchains. Auto-filled by MetaMask.
// };

export type TransactionParams = Record<string, string>;

export interface WalletExtension {
  connect: (chain: Chain) => Promise<Wallet | undefined>;
  getBalance: (address: string) => Promise<unknown>;
  isValid?: (address: string, ...args: any) => Promise<boolean>;
  isActive?: (address: string, ...args: any) => Promise<boolean>;
  sendTransaction?: (params: TransactionParams) => Promise<unknown>;
}

export class WalletExtensionFactory {
  private type: ValueOf<typeof WALLET_TYPES>;

  constructor(type: ValueOf<typeof WALLET_TYPES>) {
    this.type = type;
  }

  createWalletExtension() {
    return new Metamask();
  }
}

type MetaMaskError = {
  code: number;
};
function isMetaMaskError(error: unknown): error is MetaMaskError {
  return !!(typeof error === 'object' && error && 'code' in error);
}

export class Metamask implements WalletExtension {
  async connect(chain: Chain) {
    const chainMetaData = config.chain.metaData[chain];
    if (typeof window.ethereum === undefined) return;
    if (!chainMetaData) return;

    try {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainMetaData.metamaskParams.chainId }],
        });
      } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (isMetaMaskError(switchError) && switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [chainMetaData.metamaskParams],
            });
          } catch (addError) {
            // handle "add" error
          }
        }
        // handle other "switch" errors
      }

      const res = await window.ethereum.request<string[]>({
        method: 'eth_requestAccounts',
        // method: 'wallet_switchEthereumChain',
      });

      if (!res) return;
      if (!Array.isArray(res) || res.length === 0) return;
      if (!res[0]) return;

      return {
        type: WALLET_TYPES.METAMASK,
        address: res[0],
      };
    } catch (e) {
      logger.error(e);
      return undefined;
    }
  }

  /**
   *
   * @param address 지갑(metamask)의 address
   * @returns
   */
  async getBalance(address: string) {
    return window.ethereum.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
  }

  async sendTransaction(params: TransactionParams): Promise<string | undefined | null> {
    // https://docs.metamask.io/guide/sending-transactions.html
    return window.ethereum.request<string>({
      method: 'eth_sendTransaction',
      params: [params],
    });
  }
}
