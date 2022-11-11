import React from 'react';

import { Box, Text, HStack, Spacer, SkeletonText } from '@chakra-ui/react';
import { useAtomValue } from 'jotai';

import { tokenInAmountAtom, tokenInAtom, tokenOutAtom, useCurrency } from 'src/domain/swap/atom';
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

  const { getPriceInUSDC } = useCurrency();

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

      {/* <HStack w="100%" paddingY={1}>
        <Text fontSize={['sm', 'md', 'md', 'md']}>Eisen Fee</Text>
        <Spacer />
        <SkeletonText
          isLoaded={isLoaded}
          noOfLines={1}
          startColor="blueGray.200"
          endColor="blueGray.400">
          <Text fontSize={['sm', 'md', 'md', 'md']}>{`${previewResult.ammount.fee.toFixed(5)} ${
            previewResult.ammount.unit
          }`}</Text>
        </SkeletonText>
      </HStack> */}

      {/* <HStack w="100%" paddingY={1}>
        <Text fontSize={['sm', 'md', 'md', 'md']}>Eisen User Buyback</Text>
        <Spacer />
        <SkeletonText
          isLoaded={isLoaded}
          noOfLines={1}
          startColor="blueGray.200"
          endColor="blueGray.400">
          <Text fontSize={['sm', 'md', 'md', 'md']}>
            {`${previewResult.fee.buyback.toFixed(5)} ${previewResult.fee.unit}`}
          </Text>
        </SkeletonText>
      </HStack> */}

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
