import { ethers } from "ethers";
import { DefaultSeoProps } from "next-seo";
import { Chain } from "src/domain/chain/types";

interface ChainMetaData {
  metamaskParams: {
    chainId: string;
    chainName: string;
    rpcUrls: string[];
  };

  apiEndpoint: string;
  getBlockExplorerUrl: (hash: string) => string;
  /** wrapped native token의 가격은 native token의 가격을 바라봐야 한다. getPriceInUSDC에서 사용 */
  nativeToken: string;
  wrappedNativeToken: string;
  routeProxyAddress: string;
  approveProxyAddress: string;
}

interface MetaConfig {
  commonApiEndpoint: string;
  chain: {
    defaultChain: Chain;
    chainList: Chain[];
    metaData: Record<Exclude<Chain, 'Axelar'>, ChainMetaData>
  }
  navigation: {
    serviceName: string;
    logoURL: string;
    height: number | undefined;
  }
  seo: DefaultSeoProps;
}

const config: MetaConfig = {
  commonApiEndpoint: 'https://api.eisenfinance.com',
  chain: {
    defaultChain: 'BNB',
    chainList: ['BNB', 'polygon'],
    metaData: {
      'BNB': {
        metamaskParams: {
          chainId: ethers.utils.hexlify(56),
          chainName: 'Binance Smart Chain Mainnet',
          rpcUrls: ['https://polygonapi.terminet.io/rpc']
        },
        nativeToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        wrappedNativeToken: '0xd4949664cd82660aae99bedc034a0dea8a0bd517',
        apiEndpoint: 'https://api-bsc.eisenfinance.com',
        getBlockExplorerUrl: (txHash: string) => `https://bscscan.com/tx/${txHash}`,
        routeProxyAddress: '0x208dA73F71fE00387C3fe0c4D71b77b39a8D1c5D',
        approveProxyAddress: '0x416DEb7401bCb5CE1da7B7654505B29925EF7f17'
      },
      'polygon': {
        metamaskParams: {
          chainId: ethers.utils.hexlify(137),
          chainName: 'Polygon Mainnet',
          rpcUrls: ['https://polygonapi.terminet.io/rpc']
        },
        nativeToken: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
        wrappedNativeToken: '0xd4949664cd82660aae99bedc034a0dea8a0bd517',
        apiEndpoint: 'https://api-polygon.eisenfinance.com',
        getBlockExplorerUrl: (txHash: string) => `https://polygonscan.com/tx/${txHash}`,
        routeProxyAddress: '0x208dA73F71fE00387C3fe0c4D71b77b39a8D1c5D',
        approveProxyAddress: '0xcCa9D8D473762358A961aaFeCf1dd341214dc9c2'
      },
    },
  },
  navigation: {
    serviceName: 'MatrixSwap',
    logoURL: '/matrix-swap-logo.svg',
    height: 200,
  },
  seo: {
    title: 'MatrixSwap',
    description: '',
    additionalLinkTags: [
      {
        rel: 'icon',
        href: '',
      },
    ],
    openGraph: {
      title: '',
      type: 'website',
      url: "",
      description: '',
      images: [
        {
          url: '',
          type: 'image/png',
        },
      ],
      site_name: '',
    },
  }
}

export default config;