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

/**
 * @title ProtocolManager
 * @notice Helper contract for protocol operations and monitoring
 */
contract ProtocolManager {
    
    // Protocol contracts
    LPVault public lpVault;
    CCIPBridge public ccipBridge;
    HarpoonFactory public harpoonFactory;
    
    // Statistics
    struct ProtocolStats {
        uint256 totalLPStaked;
        uint256 totalUSDCDistributed;
        uint256 totalHarpoons;
        uint256 activeHarpoons;
        uint256 totalPnL;
        uint256 successfulHarpoons;
    }
    
    // Events
    event StatsUpdated(ProtocolStats stats);
    event RewardDistributed(uint256 amount, string source);
    
    constructor(
        address _lpVault,
        address _ccipBridge,
        address _harpoonFactory
    ) {
        lpVault = LPVault(_lpVault);
        ccipBridge = CCIPBridge(_ccipBridge);
        harpoonFactory = HarpoonFactory(_harpoonFactory);
    }
    
    /**
     * @notice Get current protocol statistics
     */
    function getProtocolStats() external view returns (ProtocolStats memory stats) {
        stats.totalLPStaked = lpVault.lpBalance();
        stats.totalUSDCDistributed = lpVault.totalRewardsDistributed();
        stats.totalHarpoons = harpoonFactory.harpoonCount();
        
        // Calculate active harpoons and P&L (simplified)
        for (uint256 i = 0; i < stats.totalHarpoons; i++) {
            address harpoonAddress = harpoonFactory.getHarpoon(i);
            Harpoon harpoon = Harpoon(harpoonAddress);
            
            if (harpoon.status() == Harpoon.Status.Open) {
                stats.activeHarpoons++;
            } else if (harpoon.status() == Harpoon.Status.Closed) {
                stats.successfulHarpoons++;
                (, , , , , int256 pnl) = harpoon.getPositionDetails();
                stats.totalPnL += uint256(pnl > 0 ? pnl : 0);
            }
        }
        
        return stats;
    }
    
    /**
     * @notice Distribute Harpoon profits to LP stakers
     * @param profitAmount Amount of profit to distribute
     */
    function distributeProfits(uint256 profitAmount) external {
        require(profitAmount > 0, "No profits to distribute");
        
        // Transfer USDC to LP Vault and notify
        IERC20 usdc = lpVault.usdc();
        usdc.transferFrom(msg.sender, address(lpVault), profitAmount);
        lpVault.notifyRewardAmount(profitAmount);
        
        emit RewardDistributed(profitAmount, "Harpoon profits");
    }
}

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing
 */
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    
    constructor(
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _totalSupply
    ) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        totalSupply = _totalSupply;
        balanceOf[msg.sender] = _totalSupply;
    }
    
    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }
    
    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        require(balanceOf[from] >= value, "Insufficient balance");
        require(allowance[from][msg.sender] >= value, "Insufficient allowance");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        allowance[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }
    
    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
    
    function mint(address to, uint256 value) external {
        balanceOf[to] += value;
        totalSupply += value;
        emit Transfer(address(0), to, value);
    }
}

/**
 * @title MockNFT
 * @notice Mock NFT contract for testing
 */
contract MockNFT {
    string public name;
    string public symbol;
    uint256 public totalSupply;
    
    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => address) public getApproved;
    mapping(address => mapping(address => bool)) public isApprovedForAll;
    
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    
    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }
    
    function mint(address to, uint256 tokenId) external {
        require(ownerOf[tokenId] == address(0), "Token already minted");
        ownerOf[tokenId] = to;
        balanceOf[to]++;
        totalSupply++;
        emit Transfer(address(0), to, tokenId);
    }
    
    function approve(address approved, uint256 tokenId) external {
        require(ownerOf[tokenId] == msg.sender, "Not owner");
        getApproved[tokenId] = approved;
        emit Approval(msg.sender, approved, tokenId);
    }
    
    function setApprovalForAll(address operator, bool approved) external {
        isApprovedForAll[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }
    
    function transferFrom(address from, address to, uint256 tokenId) external {
        require(ownerOf[tokenId] == from, "Not owner");
        require(
            msg.sender == from || 
            getApproved[tokenId] == msg.sender || 
            isApprovedForAll[from][msg.sender],
            "Not approved"
        );
        
        ownerOf[tokenId] = to;
        balanceOf[from]--;
        balanceOf[to]++;
        delete getApproved[tokenId];
        
        emit Transfer(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        transferFrom(from, to, tokenId);
    }
    
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        transferFrom(from, to, tokenId);
    }
    
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x80ac58cd || // ERC721
               interfaceId == 0x5b5e139f || // ERC721Metadata
               interfaceId == 0x01ffc9a7;   // ERC165
    }
}

// Deployment configuration
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
    
    // Mainnet addresses (examples - replace with actual)
    function getMainnetConfig() internal pure returns (
        EthereumAddresses memory eth,
        ArbitrumAddresses memory arb,
        ChainSelectors memory chains
    ) {
        eth = EthereumAddresses({
            ccipRouter: 0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D, // Example
            surfLPToken: 0x0000000000000000000000000000000000000000, // To be deployed
            usdc: 0xA0b86a33E6B84f4B7237D33b4f9F36dcb8Db37E8,
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
}