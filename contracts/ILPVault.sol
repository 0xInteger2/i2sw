// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
/**
 * @title ILPVault
 * @notice Interface for the LPVault contract
 */
interface ILPVault {
    function deposit(uint256 lpAmount) external;
    function withdraw(uint256 shareAmount) external;
    function claimRewards() external;
    function emergencyWithdraw() external;
    function notifyRewardAmount(uint256 usdcAmount) external;
    
    function pendingRewards(address user) external view returns (uint256);
    function getUserInfo(address user) external view returns (uint256 shares, uint256 rewardDebt, uint256 pendingUSDC);
    function lpBalance() external view returns (uint256);
    function totalShares() external view returns (uint256);
    function accUSDCPerShare() external view returns (uint256);
    
    function lpToken() external view returns (IERC20);
    function usdc() external view returns (IERC20);
}

/**
 * @title IHarpoonFactory
 * @notice Interface for the HarpoonFactory contract
 */
interface IHarpoonFactory {
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
    
    function createHarpoon(HarpoonParams calldata params) external payable returns (address);
    function createHarpoonFromCCIP(HarpoonParams calldata params, address creator) external returns (address);
    
    function getHarpoon(uint256 id) external view returns (address);
    function getUserHarpoons(address user) external view returns (uint256[] memory);
    function hasEligibleNFT(address user) external view returns (bool);
    function harpoonCount() external view returns (uint256);
    
    function surfBoardNFT() external view returns (address);
    function mumuFrensNFT() external view returns (address);
}

/**
 * @title IHarpoon
 * @notice Interface for individual Harpoon contracts
 */
interface IHarpoon {
    enum Status { Pending, Open, Closed, Liquidated }
    enum Platform { GMX, UNISWAP }
    enum CloseReason { Creator, Vote, Liquidation, Expiry }
    
    function openPosition() external;
    function closePositionByCreator() external;
    function liquidatePosition() external;
    function closeExpiredPosition() external;
    
    function startVoteToClose() external;
    function voteClose(uint256 tokenId, bool support) external;
    function executeVote() external;
    
    function withdrawFunds() external;
    function emergencyRecoverToken(address token, uint256 amount) external;
    
    function status() external view returns (Status);
    function creator() external view returns (address);
    function getPositionDetails() external view returns (Platform, uint256, uint256, uint256, uint256, int256);
    function getCurrentVote() external view returns (bool, uint256, uint256, uint256, uint256, bool);
    function getEstimatedPnL() external view returns (int256);
}

/**
 * @title ICCIPBridge
 * @notice Interface for cross-chain bridge
 */
interface ICCIPBridge {
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
    
    function requestHarpoonCreation(HarpoonParams calldata params) external payable returns (bytes32);
    function retryMessage(bytes32 messageId) external payable;
    
    function calculateFee(HarpoonParams calldata params) external view returns (uint256);
    function canSendMessage(address user) external view returns (bool);
    function getMessageStatus(bytes32 messageId) external view returns (address, uint256, bool, bool, uint256);
}

/**
 * @title ProtocolAggregator
 * @notice Aggregates data from all protocol contracts for easy frontend integration
 */
contract ProtocolAggregator {
    
    struct UserData {
        // LP Vault data
        uint256 lpShares;
        uint256 lpValue;
        uint256 pendingRewards;
        uint256 totalRewardsClaimed;
        
        // Harpoon data
        uint256[] harpoonIds;
        address[] harpoonAddresses;
        uint256 activeHarpoons;
        uint256 closedHarpoons;
        int256 totalPnL;
        
        // NFT data
        bool hasSurfBoard;
        bool hasMumuFrens;
        uint256[] surfTokenIds;
        uint256[] mumuTokenIds;
        
        // CCIP data
        bool canCreateHarpoon;
        uint256 estimatedFee;
    }
    
    struct ProtocolOverview {
        uint256 totalLPStaked;
        uint256 totalSharesOutstanding;
        uint256 totalRewardsDistributed;
        uint256 currentAPY;
        
        uint256 totalHarpoons;
        uint256 activeHarpoons;
        uint256 successfulHarpoons;
        uint256 totalVolume;
        int256 totalProtocolPnL;
        
        uint256 avgHarpoonDuration;
        uint256 successRate;
    }
    
    ILPVault public immutable lpVault;
    IHarpoonFactory public immutable harpoonFactory;
    ICCIPBridge public immutable ccipBridge;
    
    mapping(address => uint256) public userRewardsClaimed;
    mapping(uint256 => bool) public processedHarpoons;
    
    constructor(
        address _lpVault,
        address _harpoonFactory,
        address _ccipBridge
    ) {
        lpVault = ILPVault(_lpVault);
        harpoonFactory = IHarpoonFactory(_harpoonFactory);
        ccipBridge = ICCIPBridge(_ccipBridge);
    }
    
    /**
     * @notice Get comprehensive user data
     * @param user User address
     * @return userData Complete user data structure
     */
    function getUserData(address user) external view returns (UserData memory userData) {
        // LP Vault data
        (userData.lpShares, , userData.pendingRewards) = lpVault.getUserInfo(user);
        userData.lpValue = lpVault.totalShares() > 0 ? 
            (userData.lpShares * lpVault.lpBalance()) / lpVault.totalShares() : 0;
        userData.totalRewardsClaimed = userRewardsClaimed[user];
        
        // Harpoon data
        userData.harpoonIds = harpoonFactory.getUserHarpoons(user);
        userData.harpoonAddresses = new address[](userData.harpoonIds.length);
        
        for (uint256 i = 0; i < userData.harpoonIds.length; i++) {
            address harpoonAddr = harpoonFactory.getHarpoon(userData.harpoonIds[i]);
            userData.harpoonAddresses[i] = harpoonAddr;
            
            IHarpoon harpoon = IHarpoon(harpoonAddr);
            IHarpoon.Status status = harpoon.status();
            
            if (status == IHarpoon.Status.Open) {
                userData.activeHarpoons++;
            } else if (status == IHarpoon.Status.Closed) {
                userData.closedHarpoons++;
                userData.totalPnL += harpoon.getEstimatedPnL();
            }
        }
        
        // NFT data
        userData.hasSurfBoard = IERC721(harpoonFactory.surfBoardNFT()).balanceOf(user) > 0;
        userData.hasMumuFrens = IERC721(harpoonFactory.mumuFrensNFT()).balanceOf(user) > 0;
        
        // CCIP data
        userData.canCreateHarpoon = ccipBridge.canSendMessage(user) && 
                                   (userData.hasSurfBoard || userData.hasMumuFrens);
        
        return userData;
    }
    
    /**
     * @notice Get protocol overview statistics
     * @return overview Protocol statistics
     */
    function getProtocolOverview() external view returns (ProtocolOverview memory overview) {
        // LP Vault stats
        overview.totalLPStaked = lpVault.lpBalance();
        overview.totalSharesOutstanding = lpVault.totalShares();
        
        // Harpoon stats
        overview.totalHarpoons = harpoonFactory.harpoonCount();
        
        uint256 totalDuration = 0;
        uint256 completedHarpoons = 0;
        
        for (uint256 i = 0; i < overview.totalHarpoons; i++) {
            address harpoonAddr = harpoonFactory.getHarpoon(i);
            IHarpoon harpoon = IHarpoon(harpoonAddr);
            IHarpoon.Status status = harpoon.status();
            
            if (status == IHarpoon.Status.Open) {
                overview.activeHarpoons++;
            } else if (status == IHarpoon.Status.Closed) {
                overview.successfulHarpoons++;
                completedHarpoons++;
                
                (, , , , uint256 openTime, int256 pnl) = harpoon.getPositionDetails();
                overview.totalProtocolPnL += pnl;
                
                // Calculate duration (simplified)
                totalDuration += block.timestamp - openTime;
            }
        }
        
        // Calculate derived stats
        if (completedHarpoons > 0) {
            overview.avgHarpoonDuration = totalDuration / completedHarpoons;
            overview.successRate = (overview.successfulHarpoons * 10000) / overview.totalHarpoons; // basis points
        }
        
        return overview;
    }
    
    /**
     * @notice Get harpoon details for multiple harpoons
     * @param harpoonIds Array of harpoon IDs
     * @return details Message status details
     */
    function getMultipleHarpoonDetails(uint256[] calldata harpoonIds) 
        external view returns (IHarpoon.Platform[] memory platforms, 
                              uint256[] memory collaterals,
                              uint256[] memory sizes,
                              int256[] memory pnls,
                              IHarpoon.Status[] memory statuses) 
    {
        platforms = new IHarpoon.Platform[](harpoonIds.length);
        collaterals = new uint256[](harpoonIds.length);
        sizes = new uint256[](harpoonIds.length);
        pnls = new int256[](harpoonIds.length);
        statuses = new IHarpoon.Status[](harpoonIds.length);
        
        for (uint256 i = 0; i < harpoonIds.length; i++) {
            address harpoonAddr = harpoonFactory.getHarpoon(harpoonIds[i]);
            IHarpoon harpoon = IHarpoon(harpoonAddr);
            
            (platforms[i], collaterals[i], sizes[i], , , pnls[i]) = harpoon.getPositionDetails();
            statuses[i] = harpoon.status();
        }
        
        return (platforms, collaterals, sizes, pnls, statuses);
    }
    
    /**
     * @notice Calculate estimated fee for harpoon creation
     * @param params Harpoon parameters
     * @return Total fee in ETH
     */
    function calculateHarpoonCreationFee(IHarpoonFactory.HarpoonParams calldata params) 
        external view returns (uint256) 
    {
        ICCIPBridge.HarpoonParams memory bridgeParams = ICCIPBridge.HarpoonParams({
            targetToken: params.targetToken,
            collateralAmount: params.collateralAmount,
            leverage: params.leverage,
            isLong: params.isLong,
            slippageBps: params.slippageBps,
            platform: params.platform,
            duration: params.duration,
            platformSpecificData: params.platformSpecificData
        });
        
        return ccipBridge.calculateFee(bridgeParams);
    }
}

/**
 * @title MultiSigHarpoonManager
 * @notice Multi-signature management for high-value harpoons
 */
contract MultiSigHarpoonManager {
    
    struct Transaction {
        address target;
        bytes data;
        uint256 value;
        bool executed;
        uint256 confirmations;
        mapping(address => bool) confirmed;
    }
    
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public required;
    uint256 public transactionCount;
    mapping(uint256 => Transaction) public transactions;
    
    uint256 public constant HIGH_VALUE_THRESHOLD = 10000e6; // $10k USDC
    
    event TransactionSubmitted(uint256 indexed txId, address indexed submitter);
    event TransactionConfirmed(uint256 indexed txId, address indexed confirmer);
    event TransactionExecuted(uint256 indexed txId);
    event HighValueHarpoonCreated(address indexed harpoon, uint256 collateral);
    
    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }
    
    modifier txExists(uint256 txId) {
        require(txId < transactionCount, "Transaction does not exist");
        _;
    }
    
    modifier notExecuted(uint256 txId) {
        require(!transactions[txId].executed, "Transaction already executed");
        _;
    }
    
    modifier notConfirmed(uint256 txId) {
        require(!transactions[txId].confirmed[msg.sender], "Transaction already confirmed");
        _;
    }
    
    constructor(address[] memory _owners, uint256 _required) {
        require(_owners.length > 0, "Owners required");
        require(_required > 0 && _required <= _owners.length, "Invalid required number");
        
        for (uint256 i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Invalid owner");
            require(!isOwner[owner], "Owner not unique");
            
            isOwner[owner] = true;
            owners.push(owner);
        }
        
        required = _required;
    }
    
    /**
     * @notice Submit transaction for approval
     * @param target Target contract
     * @param data Transaction data
     * @param value ETH value
     * @return txId Transaction ID
     */
    function submitTransaction(address target, bytes calldata data, uint256 value)
        external onlyOwner returns (uint256 txId)
    {
        txId = transactionCount++;
        Transaction storage transaction = transactions[txId];
        transaction.target = target;
        transaction.data = data;
        transaction.value = value;
        
        emit TransactionSubmitted(txId, msg.sender);
        
        // Auto-confirm by submitter
        confirmTransaction(txId);
        
        return txId;
    }
    
    /**
     * @notice Confirm transaction
     * @param txId Transaction ID
     */
    function confirmTransaction(uint256 txId)
        public onlyOwner txExists(txId) notExecuted(txId) notConfirmed(txId)
    {
        transactions[txId].confirmed[msg.sender] = true;
        transactions[txId].confirmations++;
        
        emit TransactionConfirmed(txId, msg.sender);
        
        if (transactions[txId].confirmations >= required) {
            executeTransaction(txId);
        }
    }
    
    /**
     * @notice Execute confirmed transaction
     * @param txId Transaction ID
     */
    function executeTransaction(uint256 txId)
        public onlyOwner txExists(txId) notExecuted(txId)
    {
        require(transactions[txId].confirmations >= required, "Not enough confirmations");
        
        Transaction storage transaction = transactions[txId];
        transaction.executed = true;
        
        (bool success, ) = transaction.target.call{value: transaction.value}(transaction.data);
        require(success, "Transaction failed");
        
        emit TransactionExecuted(txId);
    }
    
    /**
     * @notice Check if high-value harpoon needs multi-sig approval
     * @param collateralAmount Collateral amount
     * @return Whether multi-sig is required
     */
    function requiresMultiSig(uint256 collateralAmount) external pure returns (bool) {
        return collateralAmount >= HIGH_VALUE_THRESHOLD;
    }
}

/**
 * @title HarpoonAnalytics
 * @notice Analytics and reporting for harpoon performance
 */
contract HarpoonAnalytics {
    
    struct HarpoonMetrics {
        uint256 totalVolume;
        uint256 totalPnL;
        uint256 winRate;
        uint256 avgDuration;
        uint256 avgLeverage;
        mapping(string => uint256) platformVolume;
        mapping(address => uint256) tokenVolume;
    }
    
    struct UserMetrics {
        uint256 totalHarpoons;
        uint256 successfulHarpoons;
        uint256 totalVolume;
        int256 totalPnL;
        uint256 avgHarpoonSize;
        string preferredPlatform;
    }
    
    IHarpoonFactory public immutable harpoonFactory;
    
    mapping(address => UserMetrics) public userMetrics;
    HarpoonMetrics public globalMetrics;
    
    event MetricsUpdated(address indexed user, uint256 harpoonId);
    
    constructor(address _harpoonFactory) {
        harpoonFactory = IHarpoonFactory(_harpoonFactory);
    }
    
    /**
     * @notice Update metrics when harpoon is closed
     * @param harpoonId Harpoon ID
     */
    function updateMetrics(uint256 harpoonId) external {
        address harpoonAddr = harpoonFactory.getHarpoon(harpoonId);
        IHarpoon harpoon = IHarpoon(harpoonAddr);
        
        require(harpoon.status() == IHarpoon.Status.Closed, "Harpoon not closed");
        
        address creator = harpoon.creator();
        (,uint256 collateral, uint256 size, , uint256 duration, int256 pnl) = harpoon.getPositionDetails();
        
        // Update user metrics
        UserMetrics storage userStats = userMetrics[creator];
        userStats.totalHarpoons++;
        userStats.totalVolume += size;
        userStats.totalPnL += pnl;
        
        if (pnl > 0) {
            userStats.successfulHarpoons++;
        }
        
        userStats.avgHarpoonSize = userStats.totalVolume / userStats.totalHarpoons;
        
        // Update global metrics
        globalMetrics.totalVolume += size;
        globalMetrics.totalPnL += uint256(pnl > 0 ? pnl : 0);
        
        emit MetricsUpdated(creator, harpoonId);
    }
    
    /**
     * @notice Get user performance metrics
     * @param user User address
     * @return User metrics
     */
    function getUserMetrics(address user) external view returns (UserMetrics memory) {
        return userMetrics[user];
    }
    
    /**
     * @notice Calculate platform distribution
     * @return platformNames Array of platform names
     * @return volumes Array of volumes per platform
     */
    function getPlatformDistribution() external view returns (
        string[] memory platformNames,
        uint256[] memory volumes
    ) {
        platformNames = new string[](2);
        volumes = new uint256[](2);
        
        platformNames[0] = "GMX";
        platformNames[1] = "UNISWAP";
        
        volumes[0] = globalMetrics.platformVolume["GMX"];
        volumes[1] = globalMetrics.platformVolume["UNISWAP"];
        
        return (platformNames, volumes);
    }
}