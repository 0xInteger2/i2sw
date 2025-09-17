// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";  // Changed from security/ to utils/
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";



// Trading platform interfaces
interface IGMXRouter {
    function createIncreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _amountIn,
        uint256 _minOut,
        uint256 _sizeDelta,
        bool _isLong,
        uint256 _acceptablePrice
    ) external payable;
    
    function createDecreasePosition(
        address[] memory _path,
        address _indexToken,
        uint256 _collateralDelta,
        uint256 _sizeDelta,
        bool _isLong,
        address _receiver,
        uint256 _acceptablePrice,
        uint256 _minOut
    ) external payable;
}

interface IUniswapV3Router {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }
    
    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        returns (uint256 amountOut);
}

/**
 * @title Harpoon
 * @notice Individual trading position contract supporting GMX and Uniswap
 * @dev Supports creator closure, NFT holder voting, and automated liquidation
 */
contract Harpoon is Initializable, ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════
    //                             CONSTANTS
    // ═══════════════════════════════════════════════════════════════════
    
    uint256 public constant VOTE_DURATION = 7 days;
    uint256 public constant MIN_VOTES_FOR_CLOSURE = 3;
    uint256 public constant LIQUIDATION_THRESHOLD_BPS = 8500; // 85% loss triggers liquidation
    uint256 public constant MAX_BPS = 10000;

    // ═══════════════════════════════════════════════════════════════════
    //                             ENUMS
    // ═══════════════════════════════════════════════════════════════════
    
    enum Status { Pending, Open, Closed, Liquidated }
    enum Platform { GMX, UNISWAP }
    enum CloseReason { Creator, Vote, Liquidation, Expiry }

    // ═══════════════════════════════════════════════════════════════════
    //                             STRUCTS
    // ═══════════════════════════════════════════════════════════════════
    
    struct PositionParams {
        address targetToken;        // Token being traded
        uint256 collateralAmount;   // Initial collateral
        uint256 leverage;           // Leverage multiplier
        bool isLong;               // Long or short position
        uint256 slippageBps;       // Max slippage tolerance
        string platformName;       // "GMX" or "UNISWAP"
        uint256 duration;          // Max position duration
        bytes platformSpecificData; // Platform-specific parameters
    }
    
    struct Position {
        Platform platform;
        address market;            // Market/pair address
        uint256 entryPrice;       // Entry price (scaled appropriately)
        uint256 exitPrice;        // Exit price (0 if not closed)
        uint256 collateral;       // Actual collateral used
        uint256 size;             // Position size
        uint256 openTimestamp;    // When position was opened
        uint256 closeTimestamp;   // When position was closed (0 if open)
        int256 pnl;               // Profit/loss (signed integer)
    }
    
    struct Vote {
        uint256 startTime;        // Vote start timestamp
        uint256 endTime;         // Vote end timestamp
        uint256 yesVotes;        // Number of yes votes
        uint256 noVotes;         // Number of no votes
        bool executed;           // Whether vote result was executed
        mapping(uint256 => bool) hasVoted; // tokenId => has voted
    }

    // ═══════════════════════════════════════════════════════════════════
    //                             STORAGE
    // ═══════════════════════════════════════════════════════════════════
    
    // Core contract state
    address public factory;
    address public creator;
    Status public status;
    
    // Position details
    PositionParams public params;
    Position public position;
    
    // NFT contracts for voting
    IERC721 public surfBoardNFT;
    IERC721 public mumuFrensNFT;
    
    // Trading integration
    address public platformRouter;
    
    // Voting mechanism
    Vote public currentVote;
    bool public voteInProgress;
    
    // Financial tracking
    uint256 public initialCollateral;
    uint256 public currentValue;
    CloseReason public closeReason;

    // ═══════════════════════════════════════════════════════════════════
    //                             EVENTS
    // ═══════════════════════════════════════════════════════════════════
    
    event PositionOpened(
        Platform platform,
        address market,
        uint256 collateral,
        uint256 leverage,
        bool isLong
    );
    
    event PositionClosed(
        address indexed closer,
        CloseReason reason,
        int256 pnl,
        uint256 finalValue
    );
    
    event VoteStarted(uint256 startTime, uint256 endTime);
    event VoteCast(address indexed voter, uint256 indexed tokenId, bool support);
    event VoteExecuted(bool approved, uint256 yesVotes, uint256 noVotes);
    event FundsWithdrawn(address indexed to, uint256 amount);
    event EmergencyLiquidation(uint256 losses, uint256 remaining);

    // ═══════════════════════════════════════════════════════════════════
    //                             MODIFIERS
    // ═══════════════════════════════════════════════════════════════════
    
    modifier onlyCreator() {
        require(msg.sender == creator, "Not creator");
        _;
    }
    
    modifier onlyFactory() {
        require(msg.sender == factory, "Not factory");
        _;
    }
    
    modifier onlyNFTHolder() {
        require(_ownsEligibleNFT(msg.sender), "Not NFT holder");
        _;
    }
    
    modifier onlyOpenPosition() {
        require(status == Status.Open, "Position not open");
        _;
    }
    
    modifier notExpired() {
        require(
            block.timestamp <= position.openTimestamp + params.duration,
            "Position expired"
        );
        _;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                             CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Constructor (used only for implementation)
     */
    constructor(address initialOwner) Ownable(initialOwner) {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the Harpoon (called by factory)
     * @param _creator Position creator
     * @param _surfBoardNFT SURF Board NFT contract
     * @param _mumuFrensNFT mumu-frens NFT contract
     * @param _params Position parameters
     * @param _platformRouter Trading platform router
     */
    function initialize(
        address _creator,
        address _surfBoardNFT,
        address _mumuFrensNFT,
        PositionParams calldata _params,
        address _platformRouter
    ) external initializer {
        require(_creator != address(0), "Invalid creator");
        require(_surfBoardNFT != address(0), "Invalid SURF Board NFT");
        require(_mumuFrensNFT != address(0), "Invalid mumu-frens NFT");
        require(_platformRouter != address(0), "Invalid platform router");
        
        factory = msg.sender;
        creator = _creator;
        surfBoardNFT = IERC721(_surfBoardNFT);
        mumuFrensNFT = IERC721(_mumuFrensNFT);
        platformRouter = _platformRouter;
        params = _params;
        status = Status.Pending;
        initialCollateral = _params.collateralAmount;
        
        _transferOwnership(_creator);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          POSITION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Open the trading position
     * @dev Can only be called once by creator
     */
    function openPosition() external onlyCreator nonReentrant {
        require(status == Status.Pending, "Position already opened");
        
        // Determine platform
        Platform platform;
        if (keccak256(bytes(params.platformName)) == keccak256(bytes("GMX"))) {
            platform = Platform.GMX;
        } else if (keccak256(bytes(params.platformName)) == keccak256(bytes("UNISWAP"))) {
            platform = Platform.UNISWAP;
        } else {
            revert("Unsupported platform");
        }
        
        // Get collateral from creator
        IERC20 collateralToken = IERC20(params.targetToken); // Simplified - should handle USDC
        collateralToken.safeTransferFrom(creator, address(this), params.collateralAmount);
        
        // Open position based on platform
        if (platform == Platform.GMX) {
            _openGMXPosition();
        } else {
            _openUniswapPosition();
        }
        
        // Update state
        position.platform = platform;
        position.collateral = params.collateralAmount;
        position.openTimestamp = block.timestamp;
        status = Status.Open;
        currentValue = params.collateralAmount;
        
        emit PositionOpened(
            platform,
            position.market,
            params.collateralAmount,
            params.leverage,
            params.isLong
        );
    }
    
    /**
     * @notice Close position by creator
     */
    function closePositionByCreator() external onlyCreator onlyOpenPosition nonReentrant {
        _closePosition(CloseReason.Creator);
    }
    
    /**
     * @notice Emergency liquidation if position is underwater
     */
    function liquidatePosition() external onlyOpenPosition nonReentrant {
        require(_shouldLiquidate(), "Position not liquidatable");
        _closePosition(CloseReason.Liquidation);
    }
    
    /**
     * @notice Close expired position
     */
    function closeExpiredPosition() external onlyOpenPosition nonReentrant {
        require(
            block.timestamp > position.openTimestamp + params.duration,
            "Position not expired"
        );
        _closePosition(CloseReason.Expiry);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          VOTING MECHANISM
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Start a vote to close the position
     * @dev Can be called by any NFT holder
     */
    function startVoteToClose() external onlyNFTHolder onlyOpenPosition {
        require(!voteInProgress, "Vote already in progress");
        
        currentVote.startTime = block.timestamp;
        currentVote.endTime = block.timestamp + VOTE_DURATION;
        currentVote.yesVotes = 0;
        currentVote.noVotes = 0;
        currentVote.executed = false;
        voteInProgress = true;
        
        emit VoteStarted(currentVote.startTime, currentVote.endTime);
    }
    
    /**
     * @notice Cast vote to close position
     * @param tokenId NFT token ID being used to vote
     * @param support True for yes, false for no
     */
    function voteClose(uint256 tokenId, bool support) external nonReentrant {
        require(voteInProgress, "No vote in progress");
        require(block.timestamp <= currentVote.endTime, "Voting period ended");
        require(!currentVote.hasVoted[tokenId], "Token already voted");
        require(_ownsNFTToken(msg.sender, tokenId), "Not token owner");
        
        currentVote.hasVoted[tokenId] = true;
        
        if (support) {
            currentVote.yesVotes++;
        } else {
            currentVote.noVotes++;
        }
        
        emit VoteCast(msg.sender, tokenId, support);
    }
    
    /**
     * @notice Execute vote result
     */
    function executeVote() external nonReentrant {
        require(voteInProgress, "No vote in progress");
        require(block.timestamp > currentVote.endTime, "Voting still active");
        require(!currentVote.executed, "Vote already executed");
        
        currentVote.executed = true;
        voteInProgress = false;
        
        bool approved = currentVote.yesVotes > currentVote.noVotes && 
                       currentVote.yesVotes >= MIN_VOTES_FOR_CLOSURE;
        
        emit VoteExecuted(approved, currentVote.yesVotes, currentVote.noVotes);
        
        if (approved) {
            _closePosition(CloseReason.Vote);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    //                         INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Open GMX position
     */
    function _openGMXPosition() internal {
        IGMXRouter router = IGMXRouter(platformRouter);
        
        // Approve router to spend collateral
        IERC20(params.targetToken).safeApprove(platformRouter, params.collateralAmount);
        
        // Prepare path (simplified - should be more sophisticated)
        address[] memory path = new address[](1);
        path[0] = params.targetToken;
        
        // Calculate size delta based on leverage
        uint256 sizeDelta = params.collateralAmount * params.leverage;
        
        // Calculate acceptable price with slippage
        uint256 acceptablePrice = _calculateAcceptablePrice();
        
        // Create position
        router.createIncreasePosition(
            path,
            params.targetToken,
            params.collateralAmount,
            0, // minOut
            sizeDelta,
            params.isLong,
            acceptablePrice
        );
        
        position.market = params.targetToken;
        position.size = sizeDelta;
        position.entryPrice = acceptablePrice;
    }
    
    /**
     * @notice Open Uniswap position
     */
    function _openUniswapPosition() internal {
        IUniswapV3Router router = IUniswapV3Router(platformRouter);
        
        // Approve router
        IERC20(params.targetToken).safeApprove(platformRouter, params.collateralAmount);
        
        // For Uniswap, we'll do a simple swap (simplified implementation)
        IUniswapV3Router.ExactInputSingleParams memory swapParams = IUniswapV3Router.ExactInputSingleParams({
            tokenIn: params.targetToken,
            tokenOut: params.targetToken, // Would be different in real implementation
            fee: 3000, // 0.3%
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: params.collateralAmount,
            amountOutMinimum: _calculateMinOut(),
            sqrtPriceLimitX96: 0
        });
        
        uint256 amountOut = router.exactInputSingle(swapParams);
        
        position.market = params.targetToken;
        position.size = amountOut;
        position.entryPrice = (params.collateralAmount * 1e18) / amountOut;
    }
    
    /**
     * @notice Close position and settle
     * @param reason Reason for closure
     */
    function _closePosition(CloseReason reason) internal {
        require(status == Status.Open, "Position not open");
        
        // Close based on platform
        if (position.platform == Platform.GMX) {
            _closeGMXPosition();
        } else {
            _closeUniswapPosition();
        }
        
        // Calculate P&L
        currentValue = address(this).balance + IERC20(params.targetToken).balanceOf(address(this));
        position.pnl = int256(currentValue) - int256(initialCollateral);
        position.closeTimestamp = block.timestamp;
        closeReason = reason;
        
        // Update status
        if (reason == CloseReason.Liquidation) {
            status = Status.Liquidated;
        } else {
            status = Status.Closed;
        }
        
        emit PositionClosed(msg.sender, reason, position.pnl, currentValue);
    }
    
    /**
     * @notice Close GMX position
     */
    function _closeGMXPosition() internal {
        IGMXRouter router = IGMXRouter(platformRouter);
        
        address[] memory path = new address[](1);
        path[0] = params.targetToken;
        
        router.createDecreasePosition(
            path,
            params.targetToken,
            position.collateral,
            position.size,
            params.isLong,
            address(this),
            _calculateAcceptablePrice(),
            0
        );
    }
    
    /**
     * @notice Close Uniswap position
     */
    function _closeUniswapPosition() internal {
        // Simplified - would swap back to original token
        // Implementation depends on specific Uniswap strategy used
    }
    
    /**
     * @notice Check if position should be liquidated
     */
    function _shouldLiquidate() internal view returns (bool) {
        if (status != Status.Open) return false;
        
        // Simplified liquidation logic
        uint256 currentCollateralValue = _getCurrentValue();
        uint256 lossThreshold = (initialCollateral * LIQUIDATION_THRESHOLD_BPS) / MAX_BPS;
        
        return currentCollateralValue < lossThreshold;
    }
    
    /**
     * @notice Get current position value
     */
    function _getCurrentValue() internal view returns (uint256) {
        // Simplified - would query actual position value from platform
        return currentValue;
    }
    
    /**
     * @notice Calculate acceptable price with slippage
     */
    function _calculateAcceptablePrice() internal view returns (uint256) {
        // Simplified price calculation
        return 1e18; // Placeholder
    }
    
    /**
     * @notice Calculate minimum output for swaps
     */
    function _calculateMinOut() internal view returns (uint256) {
        uint256 slippageAmount = (params.collateralAmount * params.slippageBps) / MAX_BPS;
        return params.collateralAmount - slippageAmount;
    }
    
    /**
     * @notice Check if address owns eligible NFT
     */
    function _ownsEligibleNFT(address user) internal view returns (bool) {
        return surfBoardNFT.balanceOf(user) > 0 || mumuFrensNFT.balanceOf(user) > 0;
    }
    
    /**
     * @notice Check if address owns specific NFT token
     */
    function _ownsNFTToken(address user, uint256 tokenId) internal view returns (bool) {
        try surfBoardNFT.ownerOf(tokenId) returns (address owner) {
            if (owner == user) return true;
        } catch {}
        
        try mumuFrensNFT.ownerOf(tokenId) returns (address owner) {
            if (owner == user) return true;
        } catch {}
        
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════
    //                           VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Get position details
     */
    function getPositionDetails() external view returns (
        Platform platform,
        uint256 collateral,
        uint256 size,
        uint256 entryPrice,
        uint256 openTime,
        int256 pnl
    ) {
        return (
            position.platform,
            position.collateral,
            position.size,
            position.entryPrice,
            position.openTimestamp,
            position.pnl
        );
    }
    
    /**
     * @notice Get current vote details
     */
    function getCurrentVote() external view returns (
        bool inProgress,
        uint256 startTime,
        uint256 endTime,
        uint256 yesVotes,
        uint256 noVotes,
        bool executed
    ) {
        return (
            voteInProgress,
            currentVote.startTime,
            currentVote.endTime,
            currentVote.yesVotes,
            currentVote.noVotes,
            currentVote.executed
        );
    }
    
    /**
     * @notice Check if token has voted
     */
    function hasTokenVoted(uint256 tokenId) external view returns (bool) {
        return currentVote.hasVoted[tokenId];
    }
    
    /**
     * @notice Get estimated current P&L
     */
    function getEstimatedPnL() external view returns (int256) {
        if (status != Status.Open) {
            return position.pnl;
        }
        
        uint256 currentPositionValue = _getCurrentValue();
        return int256(currentPositionValue) - int256(initialCollateral);
    }

    // ═══════════════════════════════════════════════════════════════════
    //                          FUND MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════
    
    /**
     * @notice Withdraw funds after position is closed
     */
    function withdrawFunds() external onlyCreator nonReentrant {
        require(status == Status.Closed || status == Status.Liquidated, "Position still open");
        
        uint256 ethBalance = address(this).balance;
        uint256 tokenBalance = IERC20(params.targetToken).balanceOf(address(this));
        
        if (ethBalance > 0) {
            payable(creator).transfer(ethBalance);
        }
        
        if (tokenBalance > 0) {
            IERC20(params.targetToken).safeTransfer(creator, tokenBalance);
        }
        
        emit FundsWithdrawn(creator, ethBalance + tokenBalance);
    }
    
    /**
     * @notice Emergency function to recover stuck tokens
     */
    function emergencyRecoverToken(address token, uint256 amount) external onlyCreator {
        require(status == Status.Closed || status == Status.Liquidated, "Position still active");
        IERC20(token).safeTransfer(creator, amount);
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}