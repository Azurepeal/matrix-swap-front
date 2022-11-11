import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';

import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

import {
  AxelarAssetTransfer,
  AxelarQueryAPI,
  Environment,
  EvmChain,
} from '@axelar-network/axelarjs-sdk';
import { ArrowUpDownIcon } from '@chakra-ui/icons';
import { Box, Divider, Flex, HStack, Button, IconButton, useToast } from '@chakra-ui/react';
import { BigNumber, ethers } from 'ethers';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useAtomCallback, useHydrateAtoms } from 'jotai/utils';

import config from 'meta.config';
import SlippageInput from 'src/components/SlippageInput';
import TokenAmountInput from 'src/components/TokenAmountInput';
import { keyMap } from 'src/constant/storage-key';
import { chainAtom, defaultTokenList } from 'src/domain/chain/atom';
import { Token } from 'src/domain/chain/types';
import {
  crossChainSwapEndpointsAtom,
  crossChainTokenMap,
  fromChainAtom,
  fromTokenAtom,
  fromTokenListAtom,
  toChainAtom,
  toTokenAtom,
  toTokenListAtom,
} from 'src/domain/cross-chain/atom';
import {
  balanceFetchKey,
  getTokenOutDenomAtom,
  pageModeAtom,
  slippageRatioAtom,
  tokenInAddressAtom,
  tokenInAmountAtom,
  tokenInAmountStringAtom,
  tokenOutAddressAtom,
} from 'src/domain/swap/atom';
import { useDebounce } from 'src/hooks/useDebounce';
import { useWallet } from 'src/hooks/useWallet';
import { logger } from 'src/utils/logger';
import { removeDotExceptFirstOne } from 'src/utils/with-comma';

import styles from '../Swap.module.scss';

export const getServerSideProps: GetServerSideProps<{
  defaultTokenList: Token[];
}> = async context => {
  return { props: { defaultTokenList } };
};

const CrossChain = ({
  defaultTokenList,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  useHydrateAtoms([
    [tokenInAddressAtom, defaultTokenList[0].address] as const,
    [tokenOutAddressAtom, defaultTokenList[1].address] as const,
  ]);

  const tokenInAddress = useAtomValue(tokenInAddressAtom);

  const chain = useAtomValue(chainAtom);

  const { address, sendTransaction, walletExtension } = useWallet();
  const toast = useToast();

  const selectedTokenIn = useAtomValue(fromTokenAtom);
  const selectedTokenOut = useAtomValue(toTokenAtom);

  const [tokenInAmountString, setTokenInAmountString] = useAtom(tokenInAmountStringAtom);
  const tokenInAmount = useAtomValue(tokenInAmountAtom);

  const [pageMode, setPageMode] = useAtom(pageModeAtom);

  const initAtomAddresses = useAtomCallback<void, void>(
    useCallback((get, set) => {
      set(fromChainAtom, 'BNB');
      set(tokenInAddressAtom, crossChainTokenMap['BNB'][0].address);

      set(toChainAtom, 'polygon');
      set(tokenOutAddressAtom, crossChainTokenMap['polygon'][1].address);
    }, []),
  );

  useEffect(() => {
    initAtomAddresses();
  }, []);

  const debouncedTokenInAmount = useDebounce(tokenInAmount, 200);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    const value = e.target.value;
    const [integer] = value.split('.');
    if (integer && integer.length > 10) {
      return;
    }
    setTokenInAmountString(removeDotExceptFirstOne(value));
  };

  const [slippageRatio, setSlippageRatio] = useAtom(slippageRatioAtom);

  const getTokenOutDenom = useAtomValue(getTokenOutDenomAtom);
  const updateFetchKey = useSetAtom(balanceFetchKey);

  const [needRefreshTimer, setNeedRefreshTimer] = useState(false);

  const swapEndpoints = useAtomValue(crossChainSwapEndpointsAtom);

  const handleClickReverse = useAtomCallback(
    useCallback(
      (get, set) => {
        const fromChain = get(fromChainAtom);
        const toChain = get(toChainAtom);

        set(fromChainAtom, toChain);
        set(toChainAtom, fromChain);
        const tokenInAddress = get(tokenInAddressAtom);
        const tokenOutAddress = get(tokenOutAddressAtom);

        set(tokenInAddressAtom, tokenOutAddress);
        set(tokenOutAddressAtom, tokenInAddress);
        set(tokenInAmountStringAtom, '0');
      },
      [chain],
    ),
  );

  useEffect(() => {
    if (!selectedTokenIn || !selectedTokenOut) return;

    localStorage.setItem(keyMap.SWAP_FROM_TOKEN, JSON.stringify(selectedTokenIn));
    localStorage.setItem(keyMap.SWAP_TO_TOKEN, JSON.stringify(selectedTokenOut));
  }, [selectedTokenIn, selectedTokenOut]);

  const fromChain = useAtomValue(fromChainAtom);
  const toChain = useAtomValue(toChainAtom);
  const fromTokenList = useAtomValue(fromTokenListAtom);
  const toTokenList = useAtomValue(toTokenListAtom);
  const fromToken = useAtomValue(fromTokenAtom);
  const toToken = useAtomValue(toTokenAtom);

  const isSameToken = fromToken?.symbol === toToken?.symbol;
  const [isSwapLoading, setIsSwapLoading] = useState(false);

  const handleClickSwap = async () => {
    if (!address || !tokenInAddress) return;

    if (!walletExtension) return;

    if (!fromToken || !toToken) return;
    setIsSwapLoading(true);
    const sdk = new AxelarAssetTransfer({
      environment: 'mainnet',
      auth: 'metamask',
    });
    const api = new AxelarQueryAPI({
      environment: Environment.MAINNET,
    });

    const denomOfAsset = await api.getDenomFromSymbol(toToken.symbol, toChain);
    if (!denomOfAsset) {
      setIsSwapLoading(false);
      throw new Error('denom not found');
    }

    const depositAddress = await sdk.getDepositAddress(
      fromChain === 'BNB' ? EvmChain.BINANCE : fromChain, // source chain
      toChain === 'BNB' ? EvmChain.BINANCE : toChain, // destination chain
      toToken.address, // destination address
      denomOfAsset, // denom of asset. See note (2) below
    );

    walletExtension.switchChain(fromChain);

    const provider = new ethers.providers.Web3Provider(
      window.ethereum as unknown as ethers.providers.ExternalProvider,
    );

    // if (tokenInAddress !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
    //   throw new Error('Not Available to send Eth');
    // }

    try {
      const txHash = await sendTransaction({
        from: address,
        to: depositAddress,
        value: BigNumber.from(tokenInAmount * Math.pow(10, fromToken.decimals)).toHexString(),
      });

      if (!txHash) throw new Error('invalid transaction!');

      const toastId = toast({
        title: 'Success!',
        description: `Your transaction has sent: ${txHash}`,
        status: 'success',
        position: 'top-right',
        duration: 5000,
        isClosable: true,
      });

      const receipt = await provider.waitForTransaction(txHash);
      updateFetchKey(+new Date());
      if (receipt) {
        // success
        if (toastId) toast.close(toastId);
        toast({
          title: 'Success!',
          description: (
            <a
              href={config.chain.metaData[fromChain]?.getBlockExplorerUrl(
                txHash,
              )}>{`Your transaction(${txHash}) is approved!`}</a>
          ),
          status: 'success',
          position: 'top-right',
          duration: 5000,
          isClosable: true,
        });
      } else {
        // fail
      }
      logger.debug('txhash', txHash);
    } catch (e) {
      logger.error(e);
      toast({
        title: 'Failed to send transaction',
        description: 'Sorry. Someting went wrong, please try again',
        status: 'error',
        position: 'top-right',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSwapLoading(false);
    }
  };

  const setTokenOutAddress = useSetAtom(tokenOutAddressAtom);

  useEffect(() => {
    const toToken = toTokenList.find(x => x.symbol === fromToken?.symbol);
    if (toToken) {
      setTokenOutAddress(toToken.address);
    }
  }, [tokenInAddress]);

  return (
    <>
      <main className={styles.main}>
        <Box
          className={styles['swap-container']}
          padding={12}
          paddingTop={6}
          w={['100%', '80%', '80%', '50%']}
          maxW="500px"
          borderRadius={8}>
          <Box h={3} />
          <HStack justifyContent="flex-end">
            <HStack spacing={4}></HStack>
            {/* <IconButton aria-label="swap settings" variant="outline" icon={<SettingsIcon />} /> */}
          </HStack>

          <Box h={4} />

          <TokenAmountInput
            tokenAddressAtom={tokenInAddressAtom}
            amount={tokenInAmountString}
            handleChange={handleChange}
            modalHeaderTitle={`You Sell`}
            label={`You Sell in ${fromChain}`}
            showBalance={!!address}
            tokenList={fromTokenList}
            chain={fromChain}
          />

          <Flex alignItems="center" marginY={8}>
            <Divider marginRight={4} />
            <IconButton
              aria-label="reverse-from-to"
              icon={<ArrowUpDownIcon />}
              variant="outline"
              onClick={handleClickReverse}
            />
            <Divider marginLeft={4} />
          </Flex>

          <TokenAmountInput
            tokenAddressAtom={tokenOutAddressAtom}
            amount={tokenInAmount}
            isReadOnly
            modalHeaderTitle="You Buy"
            label={`You Buy in ${toChain}`}
            tokenList={toTokenList}
            chain={toChain}
          />

          <Box w="100%" h={12} />

          <SlippageInput value={slippageRatio} setValue={setSlippageRatio} />

          <Box w="100%" h={12} />

          <Button
            isDisabled={!address || pageMode === 'flash' || !isSameToken}
            isLoading={isSwapLoading}
            w="100%"
            size="lg"
            height={['48px', '54px', '54px', '64px']}
            fontSize={['md', 'lg', 'lg', 'xl']}
            opacity={1}
            colorScheme="primary"
            onClick={handleClickSwap}>
            Swap
          </Button>
        </Box>
      </main>
    </>
  );
};

export default CrossChain;
