import React from 'react';

import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionIcon,
  AccordionPanel,
  SkeletonText,
  UnorderedList,
  ListItem,
  HStack,
  Text,
} from '@chakra-ui/react';
import Decimal from 'decimal.js';
import { useAtomValue } from 'jotai';

import { getTokenOutDenomAtom, tokenOutAtom } from 'src/domain/swap/atom';
import { QuoteResponseDto } from 'src/types/quote';
import withComma from 'src/utils/with-comma';

interface Props {
  singleDexResult: QuoteResponseDto['singleDexes'];
  isLoaded: boolean;
}

const SingleDexAccordion = ({ singleDexResult, isLoaded }: Props) => {
  const tokenOut = useAtomValue(tokenOutAtom);
  const getTokenOutDenom = useAtomValue(getTokenOutDenomAtom);

  return (
    <Accordion allowToggle mt={4} defaultIndex={[0]}>
      <AccordionItem>
        <AccordionButton paddingLeft={0}>
          <HStack>
            <Text fontSize={['sm', 'md', 'md', 'md']}>Compare to single Dex</Text>
            <AccordionIcon />
          </HStack>
        </AccordionButton>
        <AccordionPanel pb={4} paddingLeft={2}>
          <SkeletonText
            isLoaded={isLoaded}
            noOfLines={5}
            spacing="4"
            startColor="blueGray.200"
            endColor="blueGray.400">
            <UnorderedList spacing={2}>
              {singleDexResult
                .sort((a, b) => new Decimal(b.expectedAmountOut).comparedTo(a.expectedAmountOut))
                .map(item => (
                  <ListItem key={item.dexId}>
                    <HStack justifyContent="space-between">
                      <Text fontSize={['sm', 'md', 'md', 'md']}>{item.dexId}</Text>
                      <Text fontSize={['sm', 'md', 'md', 'md']}>{`${withComma(
                        getTokenOutDenom(item.expectedAmountOut),
                        3,
                      )} ${tokenOut?.symbol}`}</Text>
                    </HStack>
                  </ListItem>
                ))}
            </UnorderedList>
          </SkeletonText>
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
};

export default SingleDexAccordion;
