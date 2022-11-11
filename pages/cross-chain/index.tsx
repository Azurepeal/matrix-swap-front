import React, { ChangeEvent, useCallback, useEffect, useState } from 'react';

import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';

import { useQuery } from 'react-query';

import { ArrowUpDownIcon, RepeatIcon } from '@chakra-ui/icons';
import { Box, Divider, Flex, HStack, Button, IconButton, useToast } from '@chakra-ui/react';
import Decimal from 'decimal.js';
import { BigNumber, ethers } from 'ethers';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useAtomCallback, useHydrateAtoms } from 'jotai/utils';

import config from 'meta.config';
import { fetchQuoteCrossChain } from 'src/api/quote';
import SlippageInput from 'src/components/SlippageInput';
import SwapPreviewResult from 'src/components/SwapPreviewResult';
import TokenAmountInput from 'src/components/TokenAmountInput';
import { keyMap } from 'src/constant/storage-key';
import { chainAtom, defaultTokenList } from 'src/domain/chain/atom';
import { Token } from 'src/domain/chain/types';
import {
  crossChainSwapEndpointsAtom,
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
import queryKeys from 'src/query-key';
import { QuoteResponseDto } from 'src/types';
import { logger } from 'src/utils/logger';
import { removeDotExceptFirstOne } from 'src/utils/with-comma';
import { IERC20__factory } from 'types/ethers-contracts/factories';

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

  const { address, sendTransaction } = useWallet();
  const toast = useToast();

  const selectedTokenIn = useAtomValue(fromTokenAtom);
  const selectedTokenOut = useAtomValue(toTokenAtom);

  const [tokenInAmountString, setTokenInAmountString] = useAtom(tokenInAmountStringAtom);
  const tokenInAmount = useAtomValue(tokenInAmountAtom);

  const [pageMode, setPageMode] = useAtom(pageModeAtom);

  const initAtomAddresses = useAtomCallback<void, void>(
    useCallback((get, set) => {
      set(fromChainAtom, 'BNB');
      set(tokenInAddressAtom, '0x55d398326f99059ff775485246999027b3197955');

      set(toChainAtom, 'polygon');
      set(tokenOutAddressAtom, '0xb33eaad8d922b1083446dc23f610c2567fb5180f');
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

  const [previewResult, setPreviewResult] = useState<Omit<
    QuoteResponseDto,
    'ts' | 'error'
  > | null>();
  const tokenOutAmount = previewResult
    ? getTokenOutDenom(previewResult.dexAgg.expectedAmountOut)
    : 0;

  const [needRefreshTimer, setNeedRefreshTimer] = useState(false);

  const swapEndpoints = useAtomValue(crossChainSwapEndpointsAtom);
  const { data, isLoading, isRefetching, refetch, isError } = useQuery(
    queryKeys.quote.axelar(swapEndpoints, {
      tokenInAddr: selectedTokenIn!.address,
      tokenOutAddr: selectedTokenOut!.address,
      from: address!,
      amount: new Decimal(tokenInAmount).mul(Math.pow(10, selectedTokenIn!.decimals)).toFixed(),
      slippageBps: slippageRatio * 100,
      /**
       * constant
       */
      maxEdge: 4,
      /**
       * constant
       */
      maxSplit: 10,
      withCycle: pageMode === 'flash',
    }),
    fetchQuoteCrossChain,
    {
      enabled: Boolean(selectedTokenIn?.address && selectedTokenOut?.address && tokenInAmount),
      refetchOnWindowFocus: false,
      onSettled: () => setNeedRefreshTimer(true),
      retry: 3,
    },
  );

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
    if (!data || !selectedTokenOut) return;
    logger.debug(data);

    setPreviewResult(data);
  }, [data, selectedTokenOut]);

  useEffect(() => {
    if (!isError) return;
    setPreviewResult(null);
  }, [isError]);

  useEffect(() => {
    if (!debouncedTokenInAmount) {
      setPreviewResult(null);
      return;
    }
  }, [debouncedTokenInAmount]);

  useEffect(() => {
    if (!selectedTokenIn || !selectedTokenOut) return;

    localStorage.setItem(keyMap.SWAP_FROM_TOKEN, JSON.stringify(selectedTokenIn));
    localStorage.setItem(keyMap.SWAP_TO_TOKEN, JSON.stringify(selectedTokenOut));
  }, [selectedTokenIn, selectedTokenOut]);

  const fromChain = useAtomValue(fromChainAtom);
  const toChain = useAtomValue(toChainAtom);
  const fromTokenList = useAtomValue(fromTokenListAtom);
  const toTokenList = useAtomValue(toTokenListAtom);

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
            <HStack spacing={4}>
              <IconButton
                onClick={() => refetch()}
                aria-label="refresh swap preview"
                variant="outline"
                disabled={isRefetching || isLoading}
                icon={<RepeatIcon />}
              />
            </HStack>
            {/* <IconButton aria-label="swap settings" variant="outline" icon={<SettingsIcon />} /> */}
          </HStack>

          <Box h={4} />

          <TokenAmountInput
            tokenAddressAtom={tokenInAddressAtom}
            amount={tokenInAmountString}
            handleChange={handleChange}
            modalHeaderTitle={`You Sell`}
            label={`You Sell in ${fromChain}`}
            isInvalid={isError}
            showBalance={!!address}
            tokenList={fromTokenList}
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
            amount={tokenOutAmount}
            isReadOnly
            modalHeaderTitle="You Buy"
            label={`You Buy in ${toChain}`}
            tokenList={toTokenList}
          />

          <Box w="100%" h={12} />

          <SlippageInput value={slippageRatio} setValue={setSlippageRatio} />

          <Box w="100%" h={12} />

          <Button
            isDisabled={!address || !data?.metamaskSwapTransaction || pageMode === 'flash'}
            w="100%"
            size="lg"
            height={['48px', '54px', '54px', '64px']}
            fontSize={['md', 'lg', 'lg', 'xl']}
            opacity={1}
            colorScheme="primary"
            onClick={async () => {
              logger.debug(data?.metamaskSwapTransaction);
              if (!data?.metamaskSwapTransaction || !address || !tokenInAddress) return;
              const { gasLimit, ...rest } = data.metamaskSwapTransaction;

              const provider = new ethers.providers.Web3Provider(
                window.ethereum as unknown as ethers.providers.ExternalProvider,
              );
              const signer = provider.getSigner();

              if (tokenInAddress !== '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
                const erc20 = IERC20__factory.connect(tokenInAddress, signer);
                const allowance = await erc20.allowance(
                  address,
                  '0xb0e950099c29a4e61c77f9185c5f5f76cd9d4393',
                );

                if (allowance.eq(0)) {
                  try {
                    const tx = await erc20.approve(
                      '0xb0e950099c29a4e61c77f9185c5f5f76cd9d4393',
                      ethers.constants.MaxUint256,
                    );
                    const receipt = await tx.wait();

                    if (receipt.status !== 1) {
                      throw new Error('Approve failed');
                    }
                  } catch (e) {
                    toast({
                      title: 'Failed to send transaction',
                      description: 'Need to approve first!',
                      status: 'error',
                      position: 'top-right',
                      duration: 5000,
                      isClosable: true,
                    });
                    return;
                  }
                }
              }

              try {
                const txHash = await sendTransaction({
                  ...rest,
                  value: BigNumber.from(rest.value).toHexString(),
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
                        href={config.chain.metaData[chain]?.getBlockExplorerUrl(
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
                toast({
                  title: 'Failed to send transaction',
                  description: 'Sorry. Someting went wrong, please try again',
                  status: 'error',
                  position: 'top-right',
                  duration: 5000,
                  isClosable: true,
                });
              }
            }}>
            Swap
          </Button>
        </Box>

        {previewResult && debouncedTokenInAmount ? (
          <SwapPreviewResult
            previewResult={previewResult}
            expectedInputAmount={Number(debouncedTokenInAmount)}
            expectedOutputAmount={tokenOutAmount}
            isLoaded={!isLoading && !isRefetching}
          />
        ) : null}
      </main>
    </>
  );
};

export default CrossChain;
