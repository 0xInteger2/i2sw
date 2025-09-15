// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// CCIP interfaces
interface ICCIPRouter {
    struct EVM2AnyMessage {
        bytes receiver;
        bytes data;
        address[] tokenAddresses;
        uint256[] amounts;
        address feeToken;
        bytes extraArgs;
    }
    
    function ccipSend(
        uint64 destinationChainSelector,
        EVM2AnyMessage memory message
    ) external payable returns (bytes32 messageId);
    
    function getFee(
        uint64 destinationChainSelector,
        EVM2AnyMessage memory message
    ) external view returns (uint256 fee);
}

interface ICCIPReceiver {
    function ccipReceive(bytes calldata message) external;
}

/**
 * @title CCIPBridge
 * @notice Handles cross-chain communication between Ethereum LPVault and Arbitrum HarpoonFactory
 * @dev Manages NFT verification, message routing, and fee handling
 */
contract CCIPBridge is Ownable, ReentrancyGuard, Pausable, ICCIPReceiver {
    
    // ═══════════════════════════════════════════════════════════════════
    //                             CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    uint256 public constant MAX_MESSAGE_SIZE = 10000; // bytes
    uint256 public constant MESSAGE_TIMEOUT = 1 hours;
    uint256 public constant MAX_RETRY_ATTEMPTS = 3;

    // ═══════════════════════════════════════════════════════════════════
    //                             STORAGE
    // ═══════════════════════════════════════════════════════════════════
    
    // CCIP configuration
    ICCIPRouter public immutable ccipRouter;
    uint64 public immutable remoteChainSelector;
    address public remoteContract;
    
    // NFT contracts for access control
    IERC721 public immutable surfBoardNFT;
    IERC721 public immutable mumuFrensNFT;
    
    // LPVault integration (if deployed on Ethereum)
    address public lpVault;
    
    // Message tracking
    mapping(bytes32 => MessageStatus) public messageStatus;
    mapping(address => uint256) public userNonces;
    mapping(bytes32 => uint256) public messageRetries;
    
    // Fee management
    uint256 public baseFee = 0.01 ether;
    address public feeRecipient;
    
    // Rate limiting
    mapping(address => uint256) public lastMessageTime;
    uint256 public messageRateLimit = 1 minutes;

    // ═══════════════════════════════════════════════════════════════════
    //                             STRUCTS
    // ═══════════════════════════════════════════════════════════════════
    
    struct MessageStatus {
        address sender;
        uint256 timestamp;
        bool delivered;
        bool failed;
        uint256 retryCount;
    }
    
    struct CrossChainMessage {
        address sender;
        bytes4 selector;
        bytes data;
        uint256 nonce;
        uint256 timestamp;
        uint256 deadline;
    }
    
    struct HarpoonRequest {
        address creator;
        HarpoonParams params;
        uint256 lpStake; // User's LP stake amount (for verification)
        uint256[] nftTokenIds; // NFT tokens owned by user
    }
    
    struct HarpoonParams {
        address targetToken;
        uint256 collateralAmount;
        uint256 leverage;
        bool isLong;
        uint256 slippageBps;
        string platform;
        uint256 duration;
        bytes platformSpecificData;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                             EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    event MessageSent(
        bytes32 indexed messageId,
        address indexed sender,
        uint64 indexed destinationChain,
        bytes4 selector,
        bytes data
    );
    
    event MessageReceived(
        bytes32 indexed messageId,
        address indexed sender,
        bytes4 indexed selector
    );
    
    event MessageFailed(
        bytes32 indexed messageId,
        address indexed sender,
        string reason
    );
    
    event MessageRetried(
        bytes32 indexed messageId,
        uint256 retryCount
    );
    
    event HarpoonRequested(
        address indexed creator,
        bytes32 indexed messageId,
        HarpoonParams params
    );
    
    event NFTVerified(
        address indexed user,
        uint256[] tokenIds,
        bool verified
    );
    
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event RemoteContractUpdated(address oldContract, address newContract);

    // ═══════════════════════════════════════════════════════════════════
    //                             MODIFIERS
    // ═══════════════════════════════════════════════════════════════════
    
    modifier onlyNFTHolder(address user) {
        require(_hasEligibleNFT(user), "No eligible NFT");
        _;
    }
    
    modifier onlyCCIP() {
        require(msg.sender == address(ccipRouter), "Not CCIP router");
        _;
    }
    
    modifier onlyRemoteContract() {
        require(msg.sender == remoteContract, "Not remote contract");
        _;
    }
    
    modifier rateLimited(address user) {
        require(
            block.timestamp >= lastMessageTime[user] + messageRateLimit,
            "Rate limit exceeded"
        );
        lastMessageTime[user] = block.timestamp;
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                             CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════
    
    constructor(
        address _ccipRouter,
        uint64 _remoteChainSelector,
        address _surfBoardNFT,
        address _mumuFrensNFT,
        address _feeRecipient
    ) {
        require(_ccipRouter != address(0), "Invalid CCIP router");
        require(_surfBoardNFT != address(0), "Invalid SURF Board NFT");
        require(_mumuFrensNFT != address(0), "Invalid mumu-frens NFT");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        ccipRouter = ICCIPRouter(_ccipRouter);
        remoteChainSelector = _remoteChainSelector;
        surfBoardNFT = IERC721(_surfBoardNFT);
        mumuFrensNFT = IERC721(_mumuFrensNFT);
        feeRecipient = _feeRecipient;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          CROSS-CHAIN MESSAGING
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Send a Harpoon creation request to Arbitrum
     * @param params Harpoon parameters
     * @return messageId CCIP message ID
     */
    function requestHarpoonCreation(HarpoonParams calldata params)
        external
        payable
        nonReentrant
        whenNotPaused
        onlyNFTHolder(msg.sender)
        rateLimited(msg.sender)
        returns (bytes32 messageId)
    {
        require(remoteContract != address(0), "Remote contract not set");
        require(msg.value >= baseFee, "Insufficient fee");
        
        // Verify user's NFT ownership
        uint256[] memory tokenIds = _getUserNFTTokens(msg.sender);
        require(tokenIds.length > 0, "No NFTs found");
        
        // Get user's LP stake (if LPVault is set)
        uint256 lpStake = 0;
        if (lpVault != address(0)) {
            // Would call LPVault to get user's stake
            // lpStake = ILPVault(lpVault).getUserStake(msg.sender);
        }
        
        // Create cross-chain message
        uint256 nonce = ++userNonces[msg.sender];
        HarpoonRequest memory request = HarpoonRequest({
            creator: msg.sender,
            params: params,
            lpStake: lpStake,
            nftTokenIds: tokenIds
        });
        
        CrossChainMessage memory message = CrossChainMessage({
            sender: msg.sender,
            selector: bytes4(keccak256("createHarpoonFromCCIP(HarpoonParams,address)")),
            data: abi.encode(params, msg.sender),
            nonce: nonce,
            timestamp: block.timestamp,
            deadline: block.timestamp + MESSAGE_TIMEOUT
        });
        
        // Send CCIP message
        messageId = _sendCCIPMessage(message);
        
        // Track message
        messageStatus[messageId] = MessageStatus({
            sender: msg.sender,
            timestamp: block.timestamp,
            delivered: false,
            failed: false,
            retryCount: 0
        });
        
        // Transfer fee
        if (msg.value > 0) {
            payable(feeRecipient).transfer(msg.value);
        }
        
        emit HarpoonRequested(msg.sender, messageId, params);
        emit NFTVerified(msg.sender, tokenIds, true);
        
        return messageId;
    }
    
    /**
     * @notice Retry failed message
     * @param messageId Message ID to retry
     */
    function retryMessage(bytes32 messageId) external payable nonReentrant {
        MessageStatus storage status = messageStatus[messageId];
        require(status.sender == msg.sender, "Not message sender");
        require(status.failed || (!status.delivered && block.timestamp > status.timestamp + MESSAGE_TIMEOUT), "Message not failed");
        require(status.retryCount < MAX_RETRY_ATTEMPTS, "Max retries exceeded");
        require(msg.value >= baseFee, "Insufficient fee");
        
        status.retryCount++;
        status.failed = false;
        messageRetries[messageId] = status.retryCount;
        
        // Transfer fee
        if (msg.value > 0) {
            payable(feeRecipient).transfer(msg.value);
        }
        
        emit MessageRetried(messageId, status.retryCount);
    }
    
    /**
     * @notice Internal function to send CCIP message
     * @param message Cross-chain message
     * @return messageId CCIP message ID
     */
    function _sendCCIPMessage(CrossChainMessage memory message)
        internal
        returns (bytes32 messageId)
    {
        // Encode message
        bytes memory encodedMessage = abi.encode(message);
        require(encodedMessage.length <= MAX_MESSAGE_SIZE, "Message too large");
        
        // Prepare CCIP message
        ICCIPRouter.EVM2AnyMessage memory ccipMessage = ICCIPRouter.EVM2AnyMessage({
            receiver: abi.encode(remoteContract),
            data: encodedMessage,
            tokenAddresses: new address[](0),
            amounts: new uint256[](0),
            feeToken: address(0), // ETH
            extraArgs: ""
        });
        
        // Calculate fee
        uint256 ccipFee = ccipRouter.getFee(remoteChainSelector, ccipMessage);
        require(address(this).balance >= ccipFee, "Insufficient balance for CCIP fee");
        
        // Send message
        messageId = ccipRouter.ccipSend{value: ccipFee}(remoteChainSelector, ccipMessage);
        
        emit MessageSent(
            messageId,
            message.sender,
            remoteChainSelector,
            message.selector,
            message.data
        );
        
        return messageId;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          CCIP RECEIVER
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Receive CCIP messages from remote chain
     * @param message Encoded CCIP message
     */
    function ccipReceive(bytes calldata message) external override onlyCCIP {
        try this._processCCIPMessage(message) {
            // Message processed successfully
        } catch Error(string memory reason) {
            emit MessageFailed(keccak256(message), msg.sender, reason);
        } catch {
            emit MessageFailed(keccak256(message), msg.sender, "Unknown error");
        }
    }
    
    /**
     * @notice Process received CCIP message
     * @param message Encoded message
     */
    function _processCCIPMessage(bytes calldata message) external {
        require(msg.sender == address(this), "Only self");
        
        CrossChainMessage memory ccipMessage = abi.decode(message, (CrossChainMessage));
        bytes32 messageId = keccak256(message);
        
        // Verify message hasn't expired
        require(block.timestamp <= ccipMessage.deadline, "Message expired");
        
        // Route message based on selector
        if (ccipMessage.selector == bytes4(keccak256("harpoonCreated(address,address,uint256)"))) {
            (address creator, address harpoon, uint256 harpoonId) = abi.decode(
                ccipMessage.data,
                (address, address, uint256)
            );
            _handleHarpoonCreated(creator, harpoon, harpoonId);
        } else if (ccipMessage.selector == bytes4(keccak256("harpoonClosed(address,uint256,int256)"))) {
            (address creator, uint256 harpoonId, int256 pnl) = abi.decode(
                ccipMessage.data,
                (address, uint256, int256)
            );
            _handleHarpoonClosed(creator, harpoonId, pnl);
        }
        
        emit MessageReceived(messageId, ccipMessage.sender, ccipMessage.selector);
    }
    
    /**
     * @notice Handle Harpoon creation confirmation
     */
    function _handleHarpoonCreated(address creator, address harpoon, uint256 harpoonId) internal {
        // Could update LP rewards or notify LPVault
        if (lpVault != address(0)) {
            // ILPVault(lpVault).notifyHarpoonCreated(creator, harpoonId);
        }
    }
    
    /**
     * @notice Handle Harpoon closure notification
     */
    function _handleHarpoonClosed(address creator, uint256 harpoonId, int256 pnl) internal {
        // Could distribute profits to LP vault or update rewards
        if (lpVault != address(0) && pnl > 0) {
            // ILPVault(lpVault).distributeProfits(uint256(pnl));
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          NFT VERIFICATION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Check if user has eligible NFT
     * @param user User address
     * @return True if user owns SURF Board or mumu-frens NFT
     */
    function _hasEligibleNFT(address user) internal view returns (bool) {
        return surfBoardNFT.balanceOf(user) > 0 || mumuFrensNFT.balanceOf(user) > 0;
    }
    
    /**
     * @notice Get user's NFT token IDs
     * @param user User address
     * @return Array of token IDs owned by user
     */
    function _getUserNFTTokens(address user) internal view returns (uint256[] memory) {
        uint256 surfBalance = surfBoardNFT.balanceOf(user);
        uint256 mumuBalance = mumuFrensNFT.balanceOf(user);
        uint256 totalBalance = surfBalance + mumuBalance;
        
        uint256[] memory tokenIds = new uint256[](totalBalance);
        uint256 index = 0;
        
        // Add SURF Board NFT token IDs (simplified - would need proper enumeration)
        for (uint256 i = 0; i < surfBalance && index < totalBalance; i++) {
            // tokenIds[index] = surfBoardNFT.tokenOfOwnerByIndex(user, i);
            tokenIds[index] = i; // Placeholder
            index++;
        }
        
        // Add mumu-frens NFT token IDs
        for (uint256 i = 0; i < mumuBalance && index < totalBalance; i++) {
            // tokenIds[index] = mumuFrensNFT.tokenOfOwnerByIndex(user, i);
            tokenIds[index] = i + 10000; // Placeholder with offset
            index++;
        }
        
        return tokenIds;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get message status
     * @param messageId Message ID
     * @return Message status details
     */
    function getMessageStatus(bytes32 messageId) external view returns (
        address sender,
        uint256 timestamp,
        bool delivered,
        bool failed,
        uint256 retryCount
    ) {
        MessageStatus memory status = messageStatus[messageId];
        return (
            status.sender,
            status.timestamp,
            status.delivered,
            status.failed,
            status.retryCount
        );
    }
    
    /**
     * @notice Calculate CCIP fee for message
     * @param params Harpoon parameters
     * @return Total fee required
     */
    function calculateFee(HarpoonParams calldata params) external view returns (uint256) {
        if (remoteContract == address(0)) return baseFee;
        
        CrossChainMessage memory message = CrossChainMessage({
            sender: msg.sender,
            selector: bytes4(keccak256("createHarpoonFromCCIP(HarpoonParams,address)")),
            data: abi.encode(params, msg.sender),
            nonce: userNonces[msg.sender] + 1,
            timestamp: block.timestamp,
            deadline: block.timestamp + MESSAGE_TIMEOUT
        });
        
        bytes memory encodedMessage = abi.encode(message);
        
        ICCIPRouter.EVM2AnyMessage memory ccipMessage = ICCIPRouter.EVM2AnyMessage({
            receiver: abi.encode(remoteContract),
            data: encodedMessage,
            tokenAddresses: new address[](0),
            amounts: new uint256[](0),
            feeToken: address(0),
            extraArgs: ""
        });
        
        return baseFee + ccipRouter.getFee(remoteChainSelector, ccipMessage);
    }
    
    /**
     * @notice Check if user can send message (rate limit)
     * @param user User address
     * @return True if user can send message
     */
    function canSendMessage(address user) external view returns (bool) {
        return block.timestamp >= lastMessageTime[user] + messageRateLimit;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set remote contract address
     * @param _remoteContract Remote contract address on destination chain
     */
    function setRemoteContract(address _remoteContract) external onlyOwner {
        address oldContract = remoteContract;
        remoteContract = _remoteContract;
        emit RemoteContractUpdated(oldContract, _remoteContract);
    }
    
    /**
     * @notice Set LP Vault address
     * @param _lpVault LP Vault contract address
     */
    function setLPVault(address _lpVault) external onlyOwner {
        lpVault = _lpVault;
    }
    
    /**
     * @notice Update base fee
     * @param _newFee New base fee
     */
    function setBaseFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = baseFee;
        baseFee = _newFee;
        emit FeeUpdated(oldFee, _newFee);
    }
    
    /**
     * @notice Update fee recipient
     * @param _newRecipient New fee recipient
     */
    function setFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid recipient");
        feeRecipient = _newRecipient;
    }
    
    /**
     * @notice Update message rate limit
     * @param _newLimit New rate limit in seconds
     */
    function setMessageRateLimit(uint256 _newLimit) external onlyOwner {
        messageRateLimit = _newLimit;
    }
    
    /**
     * @notice Pause the bridge
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the bridge
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency withdraw ETH
     */
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
    
    /**
     * @notice Deposit ETH for CCIP fees
     */
    function depositForFees() external payable onlyOwner {
        // ETH received for CCIP fees
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}