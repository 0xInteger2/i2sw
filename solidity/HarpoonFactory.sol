// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./Harpoon.sol";

// CCIP interfaces (simplified for this implementation)
interface ICCIPRouter {
    function isOffRamp(address offRamp) external view returns (bool);
}

interface ICCIPReceiver {
    function ccipReceive(bytes calldata message) external;
}

/**
 * @title HarpoonFactory
 * @notice Deploys and manages Harpoon trading contracts on Arbitrum
 * @dev Handles CCIP cross-chain calls and NFT-gated access
 */
contract HarpoonFactory is Ownable, ReentrancyGuard, Pausable, ICCIPReceiver {
    
    // ═══════════════════════════════════════════════════════════════════
    //                             CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    uint256 public constant MAX_HARPOONS_PER_USER = 10;
    uint256 public constant MIN_COLLATERAL = 100e6; // $100 USDC
    uint256 public constant MAX_LEVERAGE = 20;
    uint256 public constant MAX_DURATION = 30 days;

    // ═══════════════════════════════════════════════════════════════════
    //                             STORAGE
    // ═══════════════════════════════════════════════════════════════════
    
    // CCIP and cross-chain
    ICCIPRouter public immutable ccipRouter;
    uint64 public immutable ethereumChainSelector;
    address public trustedEthereumSender;
    
    // NFT contracts for access control
    IERC721 public immutable surfBoardNFT;
    IERC721 public immutable mumuFrensNFT;
    
    // Harpoon management
    address public harpoonImplementation;
    uint256 public harpoonCount;
    mapping(uint256 => address) public harpoons;
    mapping(address => uint256[]) public userHarpoons;
    mapping(address => uint256) public userHarpoonCount;
    
    // Fee structure
    uint256 public creationFee = 0.001 ether; // ARB fee for creating harpoons
    address public feeRecipient;
    
    // Platform integrations
    mapping(string => bool) public supportedPlatforms;
    mapping(string => address) public platformRouters;

    // ═══════════════════════════════════════════════════════════════════
    //                             STRUCTS
    // ═══════════════════════════════════════════════════════════════════
    
    struct HarpoonParams {
        address targetToken;        // Token to trade
        uint256 collateralAmount;   // Collateral in USDC
        uint256 leverage;           // Leverage multiplier (1-20)
        bool isLong;               // Long or short position
        uint256 slippageBps;       // Max slippage in basis points
        string platform;           // "GMX" or "UNISWAP"
        uint256 duration;          // Max position duration in seconds
        bytes platformSpecificData; // Additional platform-specific parameters
    }
    
    struct CCIPMessage {
        address sender;            // Ethereum sender
        bytes4 selector;          // Function selector
        bytes data;               // Encoded parameters
        uint256 nonce;            // Prevent replay
    }

    // ═══════════════════════════════════════════════════════════════════
    //                             EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    event HarpoonCreated(
        uint256 indexed id,
        address indexed harpoon,
        address indexed creator,
        HarpoonParams params
    );
    
    event HarpoonClosed(uint256 indexed id, address indexed closer, uint256 pnl);
    event CCIPMessageReceived(address indexed sender, bytes4 indexed selector);
    event PlatformAdded(string platform, address router);
    event PlatformRemoved(string platform);
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event TrustedSenderUpdated(address oldSender, address newSender);

    // ═══════════════════════════════════════════════════════════════════
    //                             MODIFIERS
    // ═══════════════════════════════════════════════════════════════════
    
    modifier onlyNFTHolder(address user) {
        require(hasEligibleNFT(user), "No eligible NFT");
        _;
    }
    
    modifier onlyCCIP() {
        require(msg.sender == address(ccipRouter), "Not CCIP router");
        _;
    }
    
    modifier validHarpoonParams(HarpoonParams calldata params) {
        require(params.collateralAmount >= MIN_COLLATERAL, "Insufficient collateral");
        require(params.leverage > 0 && params.leverage <= MAX_LEVERAGE, "Invalid leverage");
        require(params.duration > 0 && params.duration <= MAX_DURATION, "Invalid duration");
        require(supportedPlatforms[params.platform], "Unsupported platform");
        require(params.slippageBps <= 1000, "Slippage too high"); // Max 10%
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                             CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════
    
    constructor(
        address _ccipRouter,
        uint64 _ethereumChainSelector,
        address _surfBoardNFT,
        address _mumuFrensNFT,
        address _feeRecipient
    ) {
        require(_ccipRouter != address(0), "Invalid CCIP router");
        require(_surfBoardNFT != address(0), "Invalid SURF Board NFT");
        require(_mumuFrensNFT != address(0), "Invalid mumu-frens NFT");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        ccipRouter = ICCIPRouter(_ccipRouter);
        ethereumChainSelector = _ethereumChainSelector;
        surfBoardNFT = IERC721(_surfBoardNFT);
        mumuFrensNFT = IERC721(_mumuFrensNFT);
        feeRecipient = _feeRecipient;
        
        // Deploy Harpoon implementation
        harpoonImplementation = address(new Harpoon());
        
        // Add supported platforms
        supportedPlatforms["GMX"] = true;
        supportedPlatforms["UNISWAP"] = true;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          CORE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Create a Harpoon from cross-chain CCIP call
     * @param params Harpoon parameters
     * @param creator Original creator from Ethereum
     * @return harpoon Address of created Harpoon contract
     */
    function createHarpoonFromCCIP(
        HarpoonParams calldata params,
        address creator
    ) 
        external 
        onlyCCIP 
        whenNotPaused
        validHarpoonParams(params)
        returns (address harpoon) 
    {
        // Verify creator has eligible NFT (would need cross-chain verification)
        // For now, we trust the Ethereum side verification
        
        return _createHarpoon(params, creator);
    }
    
    /**
     * @notice Create a Harpoon directly on Arbitrum (for NFT holders)
     * @param params Harpoon parameters
     * @return harpoon Address of created Harpoon contract
     */
    function createHarpoon(HarpoonParams calldata params) 
        external 
        payable
        nonReentrant
        whenNotPaused
        onlyNFTHolder(msg.sender)
        validHarpoonParams(params)
        returns (address harpoon) 
    {
        require(msg.value >= creationFee, "Insufficient creation fee");
        require(userHarpoonCount[msg.sender] < MAX_HARPOONS_PER_USER, "Too many harpoons");
        
        // Transfer creation fee
        if (msg.value > 0) {
            payable(feeRecipient).transfer(msg.value);
        }
        
        return _createHarpoon(params, msg.sender);
    }
    
    /**
     * @notice Internal function to create a Harpoon
     * @param params Harpoon parameters
     * @param creator Creator address
     * @return harpoon Address of created Harpoon contract
     */
    function _createHarpoon(
        HarpoonParams calldata params,
        address creator
    ) internal returns (address harpoon) {
        // Create deterministic salt for CREATE2
        bytes32 salt = keccak256(abi.encodePacked(creator, harpoonCount, block.timestamp));
        
        // Deploy Harpoon clone
        harpoon = Clones.cloneDeterministic(harpoonImplementation, salt);
        
        // Initialize Harpoon
        Harpoon(harpoon).initialize(
            creator,
            address(surfBoardNFT),
            address(mumuFrensNFT),
            params,
            platformRouters[params.platform]
        );
        
        // Update mappings
        uint256 harpoonId = harpoonCount++;
        harpoons[harpoonId] = harpoon;
        userHarpoons[creator].push(harpoonId);
        userHarpoonCount[creator]++;
        
        emit HarpoonCreated(harpoonId, harpoon, creator, params);
        
        return harpoon;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                           CCIP FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Receive CCIP messages from Ethereum
     * @param message Encoded CCIP message
     */
    function ccipReceive(bytes calldata message) external override onlyCCIP {
        CCIPMessage memory ccipMsg = abi.decode(message, (CCIPMessage));
        
        // Verify sender is trusted
        require(ccipMsg.sender == trustedEthereumSender, "Untrusted sender");
        
        // Route message based on selector
        if (ccipMsg.selector == this.createHarpoonFromCCIP.selector) {
            (HarpoonParams memory params, address creator) = abi.decode(
                ccipMsg.data, 
                (HarpoonParams, address)
            );
            this.createHarpoonFromCCIP(params, creator);
        }
        
        emit CCIPMessageReceived(ccipMsg.sender, ccipMsg.selector);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if user has eligible NFT
     * @param user User address
     * @return True if user owns SURF Board or mumu-frens NFT
     */
    function hasEligibleNFT(address user) public view returns (bool) {
        return surfBoardNFT.balanceOf(user) > 0 || mumuFrensNFT.balanceOf(user) > 0;
    }
    
    /**
     * @notice Get Harpoon address by ID
     * @param id Harpoon ID
     * @return Harpoon contract address
     */
    function getHarpoon(uint256 id) external view returns (address) {
        require(id < harpoonCount, "Invalid harpoon ID");
        return harpoons[id];
    }
    
    /**
     * @notice Get user's Harpoon IDs
     * @param user User address
     * @return Array of Harpoon IDs
     */
    function getUserHarpoons(address user) external view returns (uint256[] memory) {
        return userHarpoons[user];
    }
    
    /**
     * @notice Get Harpoon details
     * @param id Harpoon ID
     * @return harpoon Harpoon address
     * @return creator Creator address
     * @return status Current status
     */
    function getHarpoonDetails(uint256 id) external view returns (
        address harpoon,
        address creator,
        Harpoon.Status status
    ) {
        require(id < harpoonCount, "Invalid harpoon ID");
        harpoon = harpoons[id];
        Harpoon harpoonContract = Harpoon(harpoon);
        creator = harpoonContract.creator();
        status = harpoonContract.status();
    }
    
    /**
     * @notice Check if platform is supported
     * @param platform Platform name
     * @return True if platform is supported
     */
    function isPlatformSupported(string calldata platform) external view returns (bool) {
        return supportedPlatforms[platform];
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Add supported trading platform
     * @param platform Platform name (e.g., "GMX", "UNISWAP")
     * @param router Platform router address
     */
    function addPlatform(string calldata platform, address router) external onlyOwner {
        require(router != address(0), "Invalid router");
        supportedPlatforms[platform] = true;
        platformRouters[platform] = router;
        emit PlatformAdded(platform, router);
    }
    
    /**
     * @notice Remove supported trading platform
     * @param platform Platform name
     */
    function removePlatform(string calldata platform) external onlyOwner {
        supportedPlatforms[platform] = false;
        delete platformRouters[platform];
        emit PlatformRemoved(platform);
    }
    
    /**
     * @notice Set trusted Ethereum sender for CCIP
     * @param _trustedSender Ethereum LPVault or router address
     */
    function setTrustedEthereumSender(address _trustedSender) external onlyOwner {
        address oldSender = trustedEthereumSender;
        trustedEthereumSender = _trustedSender;
        emit TrustedSenderUpdated(oldSender, _trustedSender);
    }
    
    /**
     * @notice Update creation fee
     * @param _newFee New creation fee in wei
     */
    function setCreationFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = creationFee;
        creationFee = _newFee;
        emit CreationFeeUpdated(oldFee, _newFee);
    }
    
    /**
     * @notice Update fee recipient
     * @param _newRecipient New fee recipient address
     */
    function setFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid recipient");
        feeRecipient = _newRecipient;
    }
    
    /**
     * @notice Update Harpoon implementation (for upgrades)
     * @param _newImplementation New Harpoon implementation address
     */
    function setHarpoonImplementation(address _newImplementation) external onlyOwner {
        require(_newImplementation != address(0), "Invalid implementation");
        harpoonImplementation = _newImplementation;
    }
    
    /**
     * @notice Pause the factory
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the factory
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdraw ETH
     */
    function emergencyWithdrawETH() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @notice Receive function for ETH deposits
     */
    receive() external payable {}
}