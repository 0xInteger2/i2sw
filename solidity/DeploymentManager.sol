// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LPVault.sol";
import "./HarpoonFactory.sol";
import "./Harpoon.sol";
import "./CCIPBridge.sol";

/**
 * @title DeploymentManager
 * @notice Manages deployment and configuration of the LP Incentive Protocol
 * @dev Handles cross-chain coordination and initial setup
 */
contract DeploymentManager {
    
    // ═══════════════════════════════════════════════════════════════════
    //                             EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    event ContractsDeployed(
        address lpVault,
        address ccipBridge,
        address harpoonFactory,
        address harpoonImplementation
    );
    
    event CrossChainConfigured(
        address ethereumBridge,
        address arbitrumFactory,
        uint64 chainSelector
    );

    // ═══════════════════════════════════════════════════════════════════
    //                          DEPLOYMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Deploy Ethereum contracts (LPVault + CCIPBridge)
     * @param lpTokenAddress SURF/WETH LP token address
     * @param usdcAddress USDC token address
     * @param ccipRouterAddress CCIP router address on Ethereum
     * @param surfBoardNFTAddress SURF Board NFT address
     * @param mumuFrensNFTAddress mumu-frens NFT address
     * @param feeRecipient Fee recipient address
     * @param arbitrumChainSelector Arbitrum chain selector for CCIP
     * @return lpVault LPVault contract address
     * @return ccipBridge CCIPBridge contract address
     */
    function deployEthereumContracts(
        address lpTokenAddress,
        address usdcAddress,
        address ccipRouterAddress,
        address surfBoardNFTAddress,
        address mumuFrensNFTAddress,
        address feeRecipient,
        uint64 arbitrumChainSelector
    ) external returns (address lpVault, address ccipBridge) {
        
        // Deploy LPVault
        lpVault = address(new LPVault(
            lpTokenAddress,
            usdcAddress,
            feeRecipient
        ));
        
        // Deploy CCIP Bridge
        ccipBridge = address(new CCIPBridge(
            ccipRouterAddress,
            arbitrumChainSelector,
            surfBoardNFTAddress,
            mumuFrensNFTAddress,
            feeRecipient
        ));
        
        // Configure bridge to work with LP Vault
        CCIPBridge(ccipBridge).setLPVault(lpVault);
        
        return (lpVault, ccipBridge);
    }
    
    /**
     * @notice Deploy Arbitrum contracts (HarpoonFactory + implementation)
     * @param ccipRouterAddress CCIP router address on Arbitrum
     * @param ethereumChainSelector Ethereum chain selector for CCIP
     * @param surfBoardNFTAddress SURF Board NFT address on Arbitrum
     * @param mumuFrensNFTAddress mumu-frens NFT address on Arbitrum
     * @param feeRecipient Fee recipient address
     * @param gmxRouterAddress GMX router address
     * @param uniswapRouterAddress Uniswap V3 router address
     * @return harpoonFactory HarpoonFactory contract address
     * @return harpoonImplementation Harpoon implementation address
     */
    function deployArbitrumContracts(
        address ccipRouterAddress,
        uint64 ethereumChainSelector,
        address surfBoardNFTAddress,
        address mumuFrensNFTAddress,
        address feeRecipient,
        address gmxRouterAddress,
        address uniswapRouterAddress
    ) external returns (address harpoonFactory, address harpoonImplementation) {
        
        // Deploy HarpoonFactory
        harpoonFactory = address(new HarpoonFactory(
            ccipRouterAddress,
            ethereumChainSelector,
            surfBoardNFTAddress,
            mumuFrensNFTAddress,
            feeRecipient
        ));
        
        // Get Harpoon implementation address from factory
        harpoonImplementation = HarpoonFactory(harpoonFactory).harpoonImplementation();
        
        // Configure trading platforms
        HarpoonFactory(harpoonFactory).addPlatform("GMX", gmxRouterAddress);
        HarpoonFactory(harpoonFactory).addPlatform("UNISWAP", uniswapRouterAddress);
        
        return (harpoonFactory, harpoonImplementation);
    }
    
    /**
     * @notice Configure cross-chain communication between deployed contracts
     * @param ethereumBridge CCIPBridge address on Ethereum
     * @param arbitrumFactory HarpoonFactory address on Arbitrum
     */
    function configureCrossChain(
        address ethereumBridge,
        address arbitrumFactory
    ) external {
        
        // Configure Ethereum bridge to point to Arbitrum factory
        CCIPBridge(ethereumBridge).setRemoteContract(arbitrumFactory);
        
        // Configure Arbitrum factory to trust Ethereum bridge
        HarpoonFactory(arbitrumFactory).setTrustedEthereumSender(ethereumBridge);
        
        emit CrossChainConfigured(
            ethereumBridge,
            arbitrumFactory,
            CCIPBridge(ethereumBridge).remoteChainSelector()
        );
    }
}