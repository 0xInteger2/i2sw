// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeploymentConfig
 * @notice Configuration library for deployment addresses across chains
 */
library DeploymentConfig {
    struct EthereumAddresses {
        address ccipRouter;
        address surfLPToken;
        address usdc;
        address surfBoardNFT;
        address mumuFrensNFT;
        address weth;
    }
    
    struct ArbitrumAddresses {
        address ccipRouter;
        address surfBoardNFT;
        address mumuFrensNFT;
        address gmxRouter;
        address uniswapRouter;
        address usdc;
        address weth;
    }
    
    struct ChainSelectors {
        uint64 ethereum;
        uint64 arbitrum;
    }
    
    /**
     * @notice Get mainnet configuration
     * @return eth Ethereum addresses
     * @return arb Arbitrum addresses
     * @return chains Chain selectors
     */
    function getMainnetConfig() internal pure returns (
        EthereumAddresses memory eth,
        ArbitrumAddresses memory arb,
        ChainSelectors memory chains
    ) {
        eth = EthereumAddresses({
            ccipRouter: 0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D, // Example
            surfLPToken: 0x0000000000000000000000000000000000000000, // To be deployed
            usdc: 0xA0b86991c364B0e2721f7a9AC4364C38E51aFD10,
            surfBoardNFT: 0x0000000000000000000000000000000000000000, // To be provided
            mumuFrensNFT: 0x0000000000000000000000000000000000000000, // To be provided
            weth: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
        });
        
        arb = ArbitrumAddresses({
            ccipRouter: 0x141fa059441E0ca23ce184B6A78bafD2A517DdE8, // Example
            surfBoardNFT: 0x0000000000000000000000000000000000000000, // To be bridged/deployed
            mumuFrensNFT: 0x0000000000000000000000000000000000000000, // To be bridged/deployed
            gmxRouter: 0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064,
            uniswapRouter: 0xE592427A0AEce92De3Edee1F18E0157C05861564,
            usdc: 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8,
            weth: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
        });
        
        chains = ChainSelectors({
            ethereum: 5009297550715157269,
            arbitrum: 4949039107694359620
        });
    }
    
    /**
     * @notice Get testnet configuration (Sepolia/Arbitrum Sepolia)
     * @return eth Ethereum testnet addresses
     * @return arb Arbitrum testnet addresses
     * @return chains Chain selectors for testnets
     */
    function getTestnetConfig() internal pure returns (
        EthereumAddresses memory eth,
        ArbitrumAddresses memory arb,
        ChainSelectors memory chains
    ) {
        eth = EthereumAddresses({
            ccipRouter: 0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59, // Sepolia CCIP Router
            surfLPToken: 0x0000000000000000000000000000000000000000, // To be deployed
            usdc: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238, // Sepolia USDC
            surfBoardNFT: 0x0000000000000000000000000000000000000000, // To be deployed
            mumuFrensNFT: 0x0000000000000000000000000000000000000000, // To be deployed
            weth: 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9  // Sepolia WETH
        });
        
        arb = ArbitrumAddresses({
            ccipRouter: 0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165, // Arbitrum Sepolia CCIP Router
            surfBoardNFT: 0x0000000000000000000000000000000000000000, // To be deployed
            mumuFrensNFT: 0x0000000000000000000000000000000000000000, // To be deployed
            gmxRouter: 0x0000000000000000000000000000000000000000, // Mock or test GMX
            uniswapRouter: 0x0000000000000000000000000000000000000000, // Mock or test Uniswap
            usdc: 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d, // Arbitrum Sepolia USDC
            weth: 0x980B62Da83eFf3D4576C647993b0c1D7faf17c73  // Arbitrum Sepolia WETH
        });
        
        chains = ChainSelectors({
            ethereum: 16015286601757825753, // Sepolia
            arbitrum: 3478487238524512106  // Arbitrum Sepolia
        });
    }
}