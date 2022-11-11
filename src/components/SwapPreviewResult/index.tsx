import React from 'react';

import {
  Box,
  Text,
  HStack,
  Spacer,
  SkeletonText,
  VStack,
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
} from '@chakra-ui/react';
import { useAtomValue } from 'jotai';

import { chainAtom } from 'src/domain/chain/atom';
import { Chain } from 'src/domain/chain/types';
import { fromTokenAtom, toTokenAtom } from 'src/domain/cross-chain/atom';
import {
  getTokenOutDenomAtom,
  tokenInAmountAtom,
  tokenInAtom,
  tokenOutAtom,
  useCurrency,
} from 'src/domain/swap/atom';
import { AxelarEndpoint } from 'src/query-key';
import { QuoteResponseDto } from 'src/types';
import { logger } from 'src/utils/logger';
import withComma from 'src/utils/with-comma';

import RateAccordion from './RateAccordion';
import SingleDexAccordion from './SingleDexAccordion';

interface Props {
  previewResult: Omit<QuoteResponseDto, 'ts' | 'error'>;
  isLoaded?: boolean;
  expectedInputAmount: number;
  expectedOutputAmount: number;
}

interface CrossChainProps {
  previewResults: (Omit<QuoteResponseDto, 'ts' | 'error'> & AxelarEndpoint)[];
  isLoaded?: boolean;
  expectedInputAmount: number;
  expectedOutputAmount: number;
  chain: Chain;
}

const calculatePriceImpact = ({
  inputTokenAmount,
  outputTokenPriceInUSDT,
  outputTokenAmountBeforeFeeDeducted,
  inputTokenPriceInUSDT,
}: {
  inputTokenAmount: number;
  outputTokenPriceInUSDT: number;
  outputTokenAmountBeforeFeeDeducted: number;
  inputTokenPriceInUSDT: number;
}) => {
  logger.log(
    JSON.stringify({
      inputTokenAmount,
      outputTokenPriceInUSDT,
      outputTokenAmountBeforeFeeDeducted,
      inputTokenPriceInUSDT,
    }),
  );
  return (
    100 *
    ((inputTokenAmount * inputTokenPriceInUSDT) /
      (outputTokenAmountBeforeFeeDeducted * outputTokenPriceInUSDT) -
      1)
  );
};

const SwapPreviewResult = ({
  previewResult,
  expectedInputAmount,
  expectedOutputAmount,
  isLoaded = true,
}: Props) => {
  const tokenIn = useAtomValue(tokenInAtom);
  const tokenInAmount = useAtomValue(tokenInAmountAtom);
  const tokenOut = useAtomValue(tokenOutAtom);
  const chain = useAtomValue(chainAtom);

  const { getPriceInUSDC } = useCurrency(chain);

  const priceImpact =
    tokenInAmount &&
    tokenOut &&
    tokenIn &&
    getPriceInUSDC(tokenOut.address) &&
    getPriceInUSDC(tokenIn.address) &&
    calculatePriceImpact({
      inputTokenAmount: Number(tokenInAmount),
      inputTokenPriceInUSDT: getPriceInUSDC(tokenIn.address)!,
      outputTokenPriceInUSDT: getPriceInUSDC(tokenOut.address)!,
      outputTokenAmountBeforeFeeDeducted: expectedOutputAmount,
    });

  if (!tokenOut) return null;

  return (
    <Box paddingX={12} marginY={8} w={['100%', '80%', '80%', '50%']} maxW="700px">
      {tokenIn && tokenIn && expectedOutputAmount ? (
        <RateAccordion
          isLoaded={isLoaded}
          inputAmount={expectedInputAmount}
          outputAmount={expectedOutputAmount}
          fromTokenSymbol={tokenIn.symbol}
          toTokenSymbol={tokenOut.symbol}
        />
      ) : null}

      {tokenInAmount ? (
        <HStack w="100%" paddingY={1}>
          <Text fontSize={['sm', 'md', 'md', 'md']}>Price Impact</Text>
          <Spacer />
          <SkeletonText
            isLoaded={isLoaded}
            noOfLines={1}
            startColor="blueGray.200"
            endColor="blueGray.400">
            <Text
              fontSize={['sm', 'md', 'md', 'md']}
              color={priceImpact && priceImpact > 5 ? 'red' : undefined}>
              {priceImpact && priceImpact > 1 && isFinite(priceImpact)
                ? withComma(priceImpact, 1)
                : '< 1'}
              %
            </Text>
          </SkeletonText>
        </HStack>
      ) : null}
      {
        <SingleDexAccordion
          singleDexResult={previewResult.singleDexes}
          // unit={previewResult.ammount.unit}
          isLoaded={isLoaded}
        />
      }
    </Box>
  );
};

export default SwapPreviewResult;

export const CrossChainSwapPreviewResult = ({
  previewResults,
  expectedInputAmount,
  expectedOutputAmount,
  isLoaded = true,
  chain,
}: CrossChainProps) => {
  const tokenIn = useAtomValue(fromTokenAtom);
  const tokenInAmount = useAtomValue(tokenInAmountAtom);
  const tokenOut = useAtomValue(toTokenAtom);
  const getTokenOutDenom = useAtomValue(getTokenOutDenomAtom);

  const { getPriceInUSDC } = useCurrency(chain);

  const priceImpact =
    tokenInAmount &&
    tokenOut &&
    tokenIn &&
    getPriceInUSDC(tokenOut.address) &&
    getPriceInUSDC(tokenIn.address) &&
    calculatePriceImpact({
      inputTokenAmount: Number(tokenInAmount),
      inputTokenPriceInUSDT: getPriceInUSDC(tokenIn.address)!,
      outputTokenPriceInUSDT: getPriceInUSDC(tokenOut.address)!,
      outputTokenAmountBeforeFeeDeducted: expectedOutputAmount,
    });

  if (!tokenOut) return null;

  return (
    <Box paddingX={12} marginY={8} w={['100%', '80%', '80%', '50%']} maxW="700px">
      <Accordion allowToggle mb={2}>
        <AccordionItem>
          <AccordionButton paddingX={0}>
            <HStack flex={1}>
              <Text fontSize={['sm', 'md', 'md', 'md']}>Chain Compare</Text>
              <AccordionIcon />
              <Spacer />
              <SkeletonText
                isLoaded={isLoaded}
                noOfLines={1}
                startColor="blueGray.200"
                endColor="blueGray.400">
                <Text fontSize={['sm', 'md', 'md', 'md']}>
                  in {previewResults[0].chain},{' '}
                  {withComma(getTokenOutDenom(previewResults[0].dexAgg.expectedAmountOut), 3)}{' '}
                  {previewResults[0].toSymbol}
                </Text>
              </SkeletonText>
            </HStack>
          </AccordionButton>
          <AccordionPanel>
            <SkeletonText
              isLoaded={isLoaded}
              noOfLines={2}
              startColor="blueGray.200"
              endColor="blueGray.400">
              <VStack>
                {previewResults.slice(1).map(result => (
                  <Text key={result.chain} fontSize={['sm', 'md', 'md', 'md']}>
                    in {result.chain},{' '}
                    {withComma(getTokenOutDenom(result.dexAgg.expectedAmountOut), 3)}{' '}
                    {result.toSymbol}
                  </Text>
                ))}
              </VStack>
            </SkeletonText>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>

      {tokenIn && tokenIn && expectedOutputAmount ? (
        <RateAccordion
          isLoaded={isLoaded}
          inputAmount={expectedInputAmount}
          outputAmount={expectedOutputAmount}
          fromTokenSymbol={tokenIn.symbol}
          toTokenSymbol={tokenOut.symbol}
        />
      ) : null}

      {tokenInAmount ? (
        <HStack w="100%" paddingY={1}>
          <Text fontSize={['sm', 'md', 'md', 'md']}>Price Impact</Text>
          <Spacer />
          <SkeletonText
            isLoaded={isLoaded}
            noOfLines={1}
            startColor="blueGray.200"
            endColor="blueGray.400">
            <Text
              fontSize={['sm', 'md', 'md', 'md']}
              color={priceImpact && priceImpact > 5 ? 'red' : undefined}>
              {priceImpact && priceImpact > 1 && isFinite(priceImpact)
                ? withComma(priceImpact, 1)
                : '< 1'}
              %
            </Text>
          </SkeletonText>
        </HStack>
      ) : null}
      {
        <SingleDexAccordion
          singleDexResult={previewResults[0].singleDexes}
          // unit={previewResult.ammount.unit}
          isLoaded={isLoaded}
        />
      }
    </Box>
  );
};
