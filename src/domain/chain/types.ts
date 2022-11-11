export type Chain = 'polygon' | 'BNB';

export interface Token {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  iconFileExtension?: string;
  logoURI?: string;
}
