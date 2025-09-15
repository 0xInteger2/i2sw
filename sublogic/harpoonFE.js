// Frontend Integration Guide for LP Incentive Protocol
// This file provides TypeScript/JavaScript utilities for frontend integration

import { ethers } from "ethers";
import { Contract, Provider, Signer } from "ethers";

// Contract ABIs (simplified - use actual ABIs from compilation)
const LPVaultABI = [
  "function deposit(uint256 lpAmount) external",
  "function withdraw(uint256 shareAmount) external",
  "function claimRewards() external",
  "function pendingRewards(address user) external view returns (uint256)",
  "function getUserInfo(address user) external view returns (uint256 shares, uint256 rewardDebt, uint256 pendingUSDC)",
  "function lpBalance() external view returns (uint256)",
  "function totalShares() external view returns (uint256)",
  "event Deposit(address indexed user, uint256 lpAmount, uint256 shares)",
  "event Withdraw(address indexed user, uint256 shares, uint256 lpAmount)",
  "event Claim(address indexed user, uint256 amount)",
];

const HarpoonFactoryABI = [
  "function createHarpoon((address,uint256,uint256,bool,uint256,string,uint256,bytes) params) external payable returns (address)",
  "function getHarpoon(uint256 id) external view returns (address)",
  "function getUserHarpoons(address user) external view returns (uint256[])",
  "function hasEligibleNFT(address user) external view returns (bool)",
  "function harpoonCount() external view returns (uint256)",
  "function creationFee() external view returns (uint256)",
  "event HarpoonCreated(uint256 indexed id, address indexed harpoon, address indexed creator, tuple params)",
];

const HarpoonABI = [
  "function openPosition() external",
  "function closePositionByCreator() external",
  "function startVoteToClose() external",
  "function voteClose(uint256 tokenId, bool support) external",
  "function executeVote() external",
  "function withdrawFunds() external",
  "function status() external view returns (uint8)",
  "function creator() external view returns (address)",
  "function getPositionDetails() external view returns (uint8, uint256, uint256, uint256, uint256, int256)",
  "function getCurrentVote() external view returns (bool, uint256, uint256, uint256, uint256, bool)",
  "function getEstimatedPnL() external view returns (int256)",
  "event PositionOpened(uint8 platform, address market, uint256 collateral, uint256 leverage, bool isLong)",
  "event PositionClosed(address indexed closer, uint8 reason, int256 pnl, uint256 finalValue)",
  "event VoteStarted(uint256 startTime, uint256 endTime)",
  "event VoteCast(address indexed voter, uint256 indexed tokenId, bool support)",
];

const CCIPBridgeABI = [
  "function requestHarpoonCreation((address,uint256,uint256,bool,uint256,string,uint256,bytes) params) external payable returns (bytes32)",
  "function calculateFee((address,uint256,uint256,bool,uint256,string,uint256,bytes) params) external view returns (uint256)",
  "function canSendMessage(address user) external view returns (bool)",
  "function getMessageStatus(bytes32 messageId) external view returns (address, uint256, bool, bool, uint256)",
  "event HarpoonRequested(address indexed creator, bytes32 indexed messageId, tuple params)",
  "event MessageSent(bytes32 indexed messageId, address indexed sender, uint64 indexed destinationChain, bytes4 selector, bytes data)",
];

// Contract addresses (update with actual deployed addresses)
const CONTRACT_ADDRESSES = {
  ethereum: {
    lpVault: "0x0000000000000000000000000000000000000000",
    ccipBridge: "0x0000000000000000000000000000000000000000",
    surfLPToken: "0x0000000000000000000000000000000000000000",
    usdc: "0xA0b86a33E6B84f4B7237D33b4f9F36dcb8Db37E8",
    surfBoardNFT: "0x0000000000000000000000000000000000000000",
    mumuFrensNFT: "0x0000000000000000000000000000000000000000",
  },
  arbitrum: {
    harpoonFactory: "0x0000000000000000000000000000000000000000",
    surfBoardNFT: "0x0000000000000000000000000000000000000000",
    mumuFrensNFT: "0x0000000000000000000000000000000000000000",
    usdc: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
  },
};

// Chain IDs
const CHAIN_IDS = {
  ethereum: 1,
  arbitrum: 42161,
  ethereumSepolia: 11155111,
  arbitrumSepolia: 421614,
};

/**
 * LP Vault Integration Class
 */
class LPVaultClient {
  constructor(provider, signer, chainId = CHAIN_IDS.ethereum) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    const addresses =
      chainId === CHAIN_IDS.ethereum
        ? CONTRACT_ADDRESSES.ethereum
        : CONTRACT_ADDRESSES.ethereum;

    this.lpVault = new Contract(addresses.lpVault, LPVaultABI, signer);
    this.lpToken = new Contract(
      addresses.surfLPToken,
      [
        "function balanceOf(address) view returns (uint256)",
        "function approve(address,uint256) returns (bool)",
      ],
      signer
    );
    this.usdc = new Contract(
      addresses.usdc,
      ["function balanceOf(address) view returns (uint256)"],
      provider
    );
  }

  /**
   * Get user's LP vault information
   */
  async getUserInfo(userAddress) {
    try {
      const [shares, rewardDebt, pendingUSDC] = await this.lpVault.getUserInfo(
        userAddress
      );
      const lpBalance = await this.lpToken.balanceOf(userAddress);
      const usdcBalance = await this.usdc.balanceOf(userAddress);
      const totalShares = await this.lpVault.totalShares();
      const vaultLPBalance = await this.lpVault.lpBalance();

      const lpValue =
        totalShares > 0 ? (shares * vaultLPBalance) / totalShares : 0n;

      return {
        shares: ethers.formatEther(shares),
        lpValue: ethers.formatEther(lpValue),
        pendingRewards: ethers.formatUnits(pendingUSDC, 6), // USDC has 6 decimals
        lpBalance: ethers.formatEther(lpBalance),
        usdcBalance: ethers.formatUnits(usdcBalance, 6),
      };
    } catch (error) {
      console.error("Error fetching user info:", error);
      throw error;
    }
  }

  /**
   * Deposit LP tokens
   */
  async deposit(lpAmount) {
    try {
      const amount = ethers.parseEther(lpAmount.toString());

      // Check and approve if needed
      const currentAllowance = await this.lpToken.allowance(
        await this.signer.getAddress(),
        await this.lpVault.getAddress()
      );

      if (currentAllowance < amount) {
        console.log("Approving LP token...");
        const approveTx = await this.lpToken.approve(
          await this.lpVault.getAddress(),
          amount
        );
        await approveTx.wait();
      }

      console.log("Depositing LP tokens...");
      const tx = await this.lpVault.deposit(amount);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error("Error depositing:", error);
      throw error;
    }
  }

  /**
   * Withdraw LP tokens
   */
  async withdraw(shareAmount) {
    try {
      const amount = ethers.parseEther(shareAmount.toString());

      console.log("Withdrawing LP tokens...");
      const tx = await this.lpVault.withdraw(amount);
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error("Error withdrawing:", error);
      throw error;
    }
  }

  /**
   * Claim USDC rewards
   */
  async claimRewards() {
    try {
      console.log("Claiming rewards...");
      const tx = await this.lpVault.claimRewards();
      const receipt = await tx.wait();

      return {
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
      };
    } catch (error) {
      console.error("Error claiming rewards:", error);
      throw error;
    }
  }

  /**
   * Listen to LP Vault events
   */
  onDeposit(callback) {
    this.lpVault.on("Deposit", (user, lpAmount, shares, event) => {
      callback({
        user,
        lpAmount: ethers.formatEther(lpAmount),
        shares: ethers.formatEther(shares),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    });
  }

  onWithdraw(callback) {
    this.lpVault.on("Withdraw", (user, shares, lpAmount, event) => {
      callback({
        user,
        shares: ethers.formatEther(shares),
        lpAmount: ethers.formatEther(lpAmount),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    });
  }

  onClaim(callback) {
    this.lpVault.on("Claim", (user, amount, event) => {
      callback({
        user,
        amount: ethers.formatUnits(amount, 6),
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
      });
    });
  }
}

/**
 * Harpoon Integration Class
 */
class HarpoonClient {
  constructor(provider, signer, chainId = CHAIN_IDS.arbitrum) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    const addresses =
      chainId === CHAIN_IDS.arbitrum
        ? CONTRACT_ADDRESSES.arbitrum
        : CONTRACT_ADDRESSES.arbitrum;

    this.harpoonFactory = new Contract(
      addresses.harpoonFactory,
      HarpoonFactoryABI,
      signer
    );
  }

  /**
   * Check if user can create harpoons
   */
  async canCreateHarpoon(userAddress) {
    try {
      const hasNFT = await this.harpoonFactory.hasEligibleNFT(userAddress);
      const creationFee = await this.harpoonFactory.creationFee();
      const balance = await this.provider.getBalance(userAddress);

      return {
        hasEligibleNFT: hasNFT,
        hasEnoughETH: balance >= creationFee,
        requiredFee: ethers.formatEther(creationFee),
        currentBalance: ethers.formatEther(balance),
      };
    } catch (error) {
      console.error("Error checking harpoon eligibility:", error);
      throw error;
    }
  }

  /**
   * Create a harpoon
   */
  async createHarpoon(params) {
    try {
      const creationFee = await this.harpoonFactory.creationFee();

      const harpoonParams = {
        targetToken: params.targetToken,
        collateralAmount: ethers.parseUnits(
          params.collateralAmount.toString(),
          6
        ), // USDC
        leverage: params.leverage,
        isLong: params.isLong,
        slippageBps: params.slippageBps,
        platform: params.platform,
        duration: params.duration,
        platformSpecificData: params.platformSpecificData || "0x",
      };

      console.log("Creating harpoon...");
      const tx = await this.harpoonFactory.createHarpoon(harpoonParams, {
        value: creationFee,
      });
      const receipt = await tx.wait();

      // Extract harpoon address from events
      const harpoonCreatedEvent = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          ethers.id("HarpoonCreated(uint256,address,address,tuple)")
      );

      let harpoonAddress = null;
      if (harpoonCreatedEvent) {
        const decoded =
          this.harpoonFactory.interface.parseLog(harpoonCreatedEvent);
        harpoonAddress = decoded.args.harpoon;
      }

      return {
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        harpoonAddress,
        harpoonId: harpoonCreatedEvent ? Number(decoded.args.id) : null,
      };
    } catch (error) {
      console.error("Error creating harpoon:", error);
      throw error;
    }
  }

  /**
   * Get user's harpoons
   */
  async getUserHarpoons(userAddress) {
    try {
      const harpoonIds = await this.harpoonFactory.getUserHarpoons(userAddress);
      const harpoons = [];

      for (const id of harpoonIds) {
        const harpoonAddress = await this.harpoonFactory.getHarpoon(id);
        const harpoon = new Contract(harpoonAddress, HarpoonABI, this.provider);

        const [status, creator] = await Promise.all([
          harpoon.status(),
          harpoon.creator(),
        ]);

        let positionDetails = null;
        let estimatedPnL = null;

        try {
          const [platform, collateral, size, entryPrice, openTime, pnl] =
            await harpoon.getPositionDetails();
          positionDetails = {
            platform: platform === 0 ? "GMX" : "UNISWAP",
            collateral: ethers.formatUnits(collateral, 6),
            size: ethers.formatUnits(size, 6),
            entryPrice: ethers.formatEther(entryPrice),
            openTime: Number(openTime),
            pnl: ethers.formatUnits(pnl, 6),
          };

          estimatedPnL = await harpoon.getEstimatedPnL();
        } catch (err) {
          console.warn("Could not fetch position details for harpoon", id);
        }

        harpoons.push({
          id: Number(id),
          address: harpoonAddress,
          status: ["Pending", "Open", "Closed", "Liquidated"][Number(status)],
          creator,
          positionDetails,
          estimatedPnL: estimatedPnL
            ? ethers.formatUnits(estimatedPnL, 6)
            : null,
        });
      }

      return harpoons;
    } catch (error) {
      console.error("Error fetching user harpoons:", error);
      throw error;
    }
  }

  /**
   * Interact with specific harpoon
   */
  getHarpoonContract(harpoonAddress) {
    return new Contract(harpoonAddress, HarpoonABI, this.signer);
  }

  /**
   * Listen to harpoon creation events
   */
  onHarpoonCreated(callback) {
    this.harpoonFactory.on(
      "HarpoonCreated",
      (id, harpoon, creator, params, event) => {
        callback({
          id: Number(id),
          harpoonAddress: harpoon,
          creator,
          params,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        });
      }
    );
  }
}

/**
 * Cross-chain Bridge Integration
 */
class CCIPBridgeClient {
  constructor(provider, signer, chainId = CHAIN_IDS.ethereum) {
    this.provider = provider;
    this.signer = signer;
    this.chainId = chainId;

    const addresses =
      chainId === CHAIN_IDS.ethereum
        ? CONTRACT_ADDRESSES.ethereum
        : CONTRACT_ADDRESSES.ethereum;

    this.ccipBridge = new Contract(addresses.ccipBridge, CCIPBridgeABI, signer);
  }

  /**
   * Calculate fee for cross-chain harpoon creation
   */
  async calculateFee(params) {
    try {
      const harpoonParams = {
        targetToken: params.targetToken,
        collateralAmount: ethers.parseUnits(
          params.collateralAmount.toString(),
          6
        ),
        leverage: params.leverage,
        isLong: params.isLong,
        slippageBps: params.slippageBps,
        platform: params.platform,
        duration: params.duration,
        platformSpecificData: params.platformSpecificData || "0x",
      };

      const fee = await this.ccipBridge.calculateFee(harpoonParams);
      return ethers.formatEther(fee);
    } catch (error) {
      console.error("Error calculating fee:", error);
      throw error;
    }
  }

  /**
   * Request cross-chain harpoon creation
   */
  async requestHarpoonCreation(params) {
    try {
      const fee = await this.calculateFee(params);
      const feeWei = ethers.parseEther(fee);

      const harpoonParams = {
        targetToken: params.targetToken,
        collateralAmount: ethers.parseUnits(
          params.collateralAmount.toString(),
          6
        ),
        leverage: params.leverage,
        isLong: params.isLong,
        slippageBps: params.slippageBps,
        platform: params.platform,
        duration: params.duration,
        platformSpecificData: params.platformSpecificData || "0x",
      };

      console.log("Requesting cross-chain harpoon creation...");
      const tx = await this.ccipBridge.requestHarpoonCreation(harpoonParams, {
        value: feeWei,
      });
      const receipt = await tx.wait();

      // Extract message ID from events
      const messageEvent = receipt.logs.find(
        (log) =>
          log.topics[0] === ethers.id("HarpoonRequested(address,bytes32,tuple)")
      );

      let messageId = null;
      if (messageEvent) {
        const decoded = this.ccipBridge.interface.parseLog(messageEvent);
        messageId = decoded.args.messageId;
      }

      return {
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        messageId,
        fee: fee,
      };
    } catch (error) {
      console.error("Error requesting harpoon creation:", error);
      throw error;
    }
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId) {
    try {
      const [sender, timestamp, delivered, failed, retryCount] =
        await this.ccipBridge.getMessageStatus(messageId);

      return {
        sender,
        timestamp: Number(timestamp),
        delivered,
        failed,
        retryCount: Number(retryCount),
        status: failed ? "Failed" : delivered ? "Delivered" : "Pending",
      };
    } catch (error) {
      console.error("Error getting message status:", error);
      throw error;
    }
  }

  /**
   * Check if user can send message
   */
  async canSendMessage(userAddress) {
    try {
      return await this.ccipBridge.canSendMessage(userAddress);
    } catch (error) {
      console.error("Error checking message status:", error);
      throw error;
    }
  }
}

/**
 * Protocol Manager - Main integration class
 */
class LPIncentiveProtocol {
  constructor(
    ethereumProvider,
    ethereumSigner,
    arbitrumProvider,
    arbitrumSigner
  ) {
    this.lpVault = new LPVaultClient(ethereumProvider, ethereumSigner);
    this.harpoons = new HarpoonClient(arbitrumProvider, arbitrumSigner);
    this.bridge = new CCIPBridgeClient(ethereumProvider, ethereumSigner);
  }

  /**
   * Get complete user dashboard data
   */
  async getDashboardData(userAddress) {
    try {
      const [lpInfo, harpoons, canCreate] = await Promise.all([
        this.lpVault.getUserInfo(userAddress),
        this.harpoons.getUserHarpoons(userAddress),
        this.harpoons.canCreateHarpoon(userAddress),
      ]);

      return {
        lpVault: lpInfo,
        harpoons: harpoons,
        capabilities: canCreate,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  }

  /**
   * Execute LP deposit workflow
   */
  async depositLP(amount) {
    return await this.lpVault.deposit(amount);
  }

  /**
   * Execute harpoon creation workflow (cross-chain)
   */
  async createCrossChainHarpoon(params) {
    return await this.bridge.requestHarpoonCreation(params);
  }

  /**
   * Execute harpoon creation workflow (direct on Arbitrum)
   */
  async createDirectHarpoon(params) {
    return await this.harpoons.createHarpoon(params);
  }
}

// Utility functions
const ProtocolUtils = {
  /**
   * Format large numbers for display
   */
  formatNumber(num, decimals = 2) {
    if (num >= 1e9) return (num / 1e9).toFixed(decimals) + "B";
    if (num >= 1e6) return (num / 1e6).toFixed(decimals) + "M";
    if (num >= 1e3) return (num / 1e3).toFixed(decimals) + "K";
    return num.toFixed(decimals);
  },

  /**
   * Calculate APY from rewards
   */
  calculateAPY(totalRewards, totalStaked, timeframe) {
    const yearlyRewards = totalRewards * ((365 * 24 * 3600) / timeframe);
    return totalStaked > 0 ? (yearlyRewards / totalStaked) * 100 : 0;
  },

  /**
   * Format time duration
   */
  formatDuration(seconds) {
    const days = Math.floor(seconds / (24 * 3600));
    const hours = Math.floor((seconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  },

  /**
   * Validate harpoon parameters
   */
  validateHarpoonParams(params) {
    const errors = [];

    if (!params.targetToken || !ethers.isAddress(params.targetToken)) {
      errors.push("Invalid target token address");
    }

    if (params.collateralAmount < 100) {
      errors.push("Minimum collateral is $100");
    }

    if (params.leverage < 1 || params.leverage > 20) {
      errors.push("Leverage must be between 1 and 20");
    }

    if (params.slippageBps > 1000) {
      errors.push("Slippage cannot exceed 10%");
    }

    if (!["GMX", "UNISWAP"].includes(params.platform)) {
      errors.push("Platform must be GMX or UNISWAP");
    }

    if (params.duration > 30 * 24 * 3600) {
      errors.push("Duration cannot exceed 30 days");
    }

    return errors;
  },
};

// Export for use in frontend applications
export {
  LPVaultClient,
  HarpoonClient,
  CCIPBridgeClient,
  LPIncentiveProtocol,
  ProtocolUtils,
  CONTRACT_ADDRESSES,
  CHAIN_IDS,
};
