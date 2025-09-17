// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title LPVault
 * @notice Users deposit SURF/WETH Uniswap V2 LP tokens and earn USDC rewards
 * @dev Implements a share-based reward distribution system
 */
contract LPVault is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ═══════════════════════════════════════════════════════════════════
    //                             CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    uint256 private constant PRECISION = 1e30;
    uint256 public constant EMERGENCY_WITHDRAW_FEE_BPS = 100; // 1%
    uint256 public constant MAX_BPS = 10000;
    uint256 public constant MIN_DEPOSIT = 1e15; // 0.001 LP tokens

    // ═══════════════════════════════════════════════════════════════════
    //                             STORAGE
    // ═══════════════════════════════════════════════════════════════════
    
    IERC20 public immutable lpToken;   // SURF/WETH LP token
    IERC20 public immutable usdc;      // Reward token
    
    uint256 public totalShares;        // Total shares outstanding
    uint256 public accUSDCPerShare;    // Accumulated USDC per share (scaled by PRECISION)
    uint256 public lastRewardBlock;    // Last block when rewards were distributed
    
    // Emergency withdraw fee recipient
    address public feeRecipient;
    
    // Reward distribution
    address public rewardDistributor;
    uint256 public totalRewardsDistributed;
    
    struct UserInfo {
        uint256 shares;                // User's share in the pool
        uint256 rewardDebt;           // Reward debt for accurate reward calculation
        uint256 lastDepositBlock;     // Last deposit block (for potential time locks)
    }
    
    mapping(address => UserInfo) public users;

    // ═══════════════════════════════════════════════════════════════════
    //                             EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    event Deposit(address indexed user, uint256 lpAmount, uint256 shares);
    event Withdraw(address indexed user, uint256 shares, uint256 lpAmount);
    event EmergencyWithdraw(address indexed user, uint256 lpAmount, uint256 fee);
    event Claim(address indexed user, uint256 amount);
    event RewardNotified(uint256 amount, address indexed distributor);
    event RewardDistributorChanged(address indexed oldDistributor, address indexed newDistributor);
    event FeeRecipientChanged(address indexed oldRecipient, address indexed newRecipient);

    // ═══════════════════════════════════════════════════════════════════
    //                             MODIFIERS
    // ═══════════════════════════════════════════════════════════════════
    
    modifier onlyRewardDistributor() {
        require(msg.sender == rewardDistributor || msg.sender == owner(), "Not authorized");
        _;
    }

    modifier updateReward(address user) {
        if (user != address(0)) {
            users[user].rewardDebt = users[user].shares * accUSDCPerShare / PRECISION;
        }
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                             CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Constructor
     * @param _lpToken SURF/WETH LP token address
     * @param _usdc USDC token address
     * @param _feeRecipient Emergency withdraw fee recipient
     */
    constructor(
        address _lpToken,
        address _usdc,
        address _feeRecipient
    ) Ownable(msg.sender) {
        require(_lpToken != address(0), "Invalid LP token");
        require(_usdc != address(0), "Invalid USDC token");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        
        lpToken = IERC20(_lpToken);
        usdc = IERC20(_usdc);
        feeRecipient = _feeRecipient;
        rewardDistributor = msg.sender;
        lastRewardBlock = block.number;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          CORE USER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Deposit LP tokens to earn USDC rewards
     * @param lpAmount Amount of LP tokens to deposit
     */
    function deposit(uint256 lpAmount) external nonReentrant whenNotPaused updateReward(msg.sender) {
        require(lpAmount >= MIN_DEPOSIT, "Deposit too small");
        
        UserInfo storage user = users[msg.sender];
        
        // Calculate shares to mint
        uint256 shares;
        if (totalShares == 0) {
            shares = lpAmount;
        } else {
            shares = lpAmount * totalShares / lpBalance();
        }
        
        require(shares > 0, "No shares minted");
        
        // Update state
        user.shares += shares;
        user.lastDepositBlock = block.number;
        totalShares += shares;
        
        // Transfer LP tokens
        lpToken.safeTransferFrom(msg.sender, address(this), lpAmount);
        
        emit Deposit(msg.sender, lpAmount, shares);
    }
    
    /**
     * @notice Withdraw LP tokens by burning shares
     * @param shareAmount Amount of shares to burn
     */
    function withdraw(uint256 shareAmount) external nonReentrant updateReward(msg.sender) {
        UserInfo storage user = users[msg.sender];
        require(shareAmount > 0, "Invalid share amount");
        require(user.shares >= shareAmount, "Insufficient shares");
        
        // Calculate LP tokens to return
        uint256 lpAmount = shareAmount * lpBalance() / totalShares;
        require(lpAmount > 0, "No LP tokens to withdraw");
        
        // Update state
        user.shares -= shareAmount;
        totalShares -= shareAmount;
        
        // Transfer LP tokens
        lpToken.safeTransfer(msg.sender, lpAmount);
        
        emit Withdraw(msg.sender, shareAmount, lpAmount);
    }
    
    /**
     * @notice Claim accumulated USDC rewards
     */
    function claimRewards() external nonReentrant updateReward(msg.sender) {
        uint256 rewards = pendingRewards(msg.sender);
        if (rewards > 0) {
            users[msg.sender].rewardDebt = users[msg.sender].shares * accUSDCPerShare / PRECISION;
            usdc.safeTransfer(msg.sender, rewards);
            emit Claim(msg.sender, rewards);
        }
    }
    
    /**
     * @notice Emergency withdraw all LP tokens (with fee)
     */
    function emergencyWithdraw() external nonReentrant {
        UserInfo storage user = users[msg.sender];
        uint256 userShares = user.shares;
        require(userShares > 0, "No shares to withdraw");
        
        // Calculate LP tokens
        uint256 lpAmount = userShares * lpBalance() / totalShares;
        uint256 fee = lpAmount * EMERGENCY_WITHDRAW_FEE_BPS / MAX_BPS;
        uint256 userAmount = lpAmount - fee;
        
        // Reset user
        user.shares = 0;
        user.rewardDebt = 0;
        totalShares -= userShares;
        
        // Transfer tokens
        if (userAmount > 0) {
            lpToken.safeTransfer(msg.sender, userAmount);
        }
        if (fee > 0) {
            lpToken.safeTransfer(feeRecipient, fee);
        }
        
        emit EmergencyWithdraw(msg.sender, userAmount, fee);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          REWARD DISTRIBUTION
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Distribute USDC rewards to all LP stakers
     * @param usdcAmount Amount of USDC to distribute
     */
    function notifyRewardAmount(uint256 usdcAmount) external onlyRewardDistributor {
        require(usdcAmount > 0, "No rewards to distribute");
        require(totalShares > 0, "No shares to distribute to");
        
        // Transfer USDC from distributor
        usdc.safeTransferFrom(msg.sender, address(this), usdcAmount);
        
        // Update accumulated rewards per share
        accUSDCPerShare += usdcAmount * PRECISION / totalShares;
        totalRewardsDistributed += usdcAmount;
        lastRewardBlock = block.number;
        
        emit RewardNotified(usdcAmount, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Calculate pending USDC rewards for a user
     * @param user User address
     * @return Pending USDC rewards
     */
    function pendingRewards(address user) public view returns (uint256) {
        UserInfo memory userInfo = users[user];
        if (userInfo.shares == 0) {
            return 0;
        }
        
        uint256 totalRewards = userInfo.shares * accUSDCPerShare / PRECISION;
        if (totalRewards <= userInfo.rewardDebt) {
            return 0;
        }
        
        return totalRewards - userInfo.rewardDebt;
    }
    
    /**
     * @notice Get current LP token balance of the contract
     * @return LP token balance
     */
    function lpBalance() public view returns (uint256) {
        return lpToken.balanceOf(address(this));
    }
    
    /**
     * @notice Get user info
     * @param user User address
     * @return shares User's shares
     * @return rewardDebt User's reward debt
     * @return pendingUSDC Pending USDC rewards
     */
    function getUserInfo(address user) external view returns (
        uint256 shares,
        uint256 rewardDebt,
        uint256 pendingUSDC
    ) {
        UserInfo memory userInfo = users[user];
        return (
            userInfo.shares,
            userInfo.rewardDebt,
            pendingRewards(user)
        );
    }
    
    /**
     * @notice Calculate LP tokens for a given amount of shares
     * @param shareAmount Amount of shares
     * @return LP token amount
     */
    function sharesToLP(uint256 shareAmount) external view returns (uint256) {
        if (totalShares == 0) {
            return shareAmount;
        }
        return shareAmount * lpBalance() / totalShares;
    }
    
    /**
     * @notice Calculate shares for a given amount of LP tokens
     * @param lpAmount Amount of LP tokens
     * @return Share amount
     */
    function lpToShares(uint256 lpAmount) external view returns (uint256) {
        if (totalShares == 0) {
            return lpAmount;
        }
        return lpAmount * totalShares / lpBalance();
    }

    // ═══════════════════════════════════════════════════════════════════
    //                         ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Set reward distributor address
     * @param _rewardDistributor New reward distributor address
     */
    function setRewardDistributor(address _rewardDistributor) external onlyOwner {
        require(_rewardDistributor != address(0), "Invalid address");
        address oldDistributor = rewardDistributor;
        rewardDistributor = _rewardDistributor;
        emit RewardDistributorChanged(oldDistributor, _rewardDistributor);
    }
    
    /**
     * @notice Set fee recipient address
     * @param _feeRecipient New fee recipient address
     */
    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid address");
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientChanged(oldRecipient, _feeRecipient);
    }
    
    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Emergency function to recover stuck tokens (not LP or USDC)
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        require(token != address(lpToken), "Cannot recover LP token");
        require(token != address(usdc), "Cannot recover USDC");
        IERC20(token).safeTransfer(owner(), amount);
    }
}