# LP Incentive Protocol - Testing & Deployment Guide

## Table of Contents

1. [Overview](#overview)
2. [Testing Framework](#testing-framework)
3. [Deployment Scripts](#deployment-scripts)
4. [Security Checklist](#security-checklist)
5. [Monitoring & Maintenance](#monitoring--maintenance)
6. [Troubleshooting](#troubleshooting)

## Overview

The LP Incentive Protocol is a sophisticated cross-chain DeFi system that combines LP token staking rewards with cross-chain trading positions ("Harpoons"). This guide covers comprehensive testing, deployment, and maintenance procedures.

### Architecture Summary

- **Ethereum**: LPVault (LP staking + USDC rewards) + CCIPBridge (cross-chain messaging)
- **Arbitrum**: HarpoonFactory (position management) + Harpoon contracts (individual trades)
- **Access Control**: NFT-gated (SURF Board + mumu-frens)
- **Integration**: GMX + Uniswap V3 trading

## Testing Framework

### Unit Tests (Hardhat/Foundry)

```javascript
// test/LPVault.test.js
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LPVault", function () {
  let lpVault, lpToken, usdc, owner, user1, user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock tokens
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    lpToken = await MockERC20.deploy(
      "SURF/WETH LP",
      "SURF-LP",
      18,
      ethers.parseEther("1000000")
    );
    usdc = await MockERC20.deploy(
      "USD Coin",
      "USDC",
      6,
      ethers.parseUnits("1000000", 6)
    );

    // Deploy LPVault
    const LPVault = await ethers.getContractFactory("LPVault");
    lpVault = await LPVault.deploy(
      await lpToken.getAddress(),
      await usdc.getAddress(),
      owner.address
    );

    // Setup initial balances
    await lpToken.transfer(user1.address, ethers.parseEther("1000"));
    await lpToken.transfer(user2.address, ethers.parseEther("1000"));
    await usdc.transfer(
      await lpVault.getAddress(),
      ethers.parseUnits("10000", 6)
    );
  });

  describe("Deposit/Withdraw", function () {
    it("Should deposit LP tokens correctly", async function () {
      const depositAmount = ethers.parseEther("100");

      // Approve and deposit
      await lpToken
        .connect(user1)
        .approve(await lpVault.getAddress(), depositAmount);
      await expect(lpVault.connect(user1).deposit(depositAmount))
        .to.emit(lpVault, "Deposit")
        .withArgs(user1.address, depositAmount, depositAmount);

      // Check balances
      const userInfo = await lpVault.getUserInfo(user1.address);
      expect(userInfo.shares).to.equal(depositAmount);
    });

    it("Should handle multiple deposits with correct share calculation", async function () {
      const firstDeposit = ethers.parseEther("100");
      const secondDeposit = ethers.parseEther("50");

      // First deposit
      await lpToken
        .connect(user1)
        .approve(await lpVault.getAddress(), firstDeposit);
      await lpVault.connect(user1).deposit(firstDeposit);

      // Second deposit (different user)
      await lpToken
        .connect(user2)
        .approve(await lpVault.getAddress(), secondDeposit);
      await lpVault.connect(user2).deposit(secondDeposit);

      // Check share calculations
      const user1Info = await lpVault.getUserInfo(user1.address);
      const user2Info = await lpVault.getUserInfo(user2.address);

      expect(user1Info.shares).to.equal(firstDeposit);
      expect(user2Info.shares).to.equal(secondDeposit);
    });

    it("Should withdraw LP tokens correctly", async function () {
      const depositAmount = ethers.parseEther("100");
      const withdrawShares = ethers.parseEther("50");

      // Deposit first
      await lpToken
        .connect(user1)
        .approve(await lpVault.getAddress(), depositAmount);
      await lpVault.connect(user1).deposit(depositAmount);

      // Withdraw
      await expect(lpVault.connect(user1).withdraw(withdrawShares))
        .to.emit(lpVault, "Withdraw")
        .withArgs(user1.address, withdrawShares, withdrawShares);

      // Check remaining shares
      const userInfo = await lpVault.getUserInfo(user1.address);
      expect(userInfo.shares).to.equal(depositAmount - withdrawShares);
    });
  });

  describe("Reward Distribution", function () {
    beforeEach(async function () {
      // Setup users with deposits
      const depositAmount = ethers.parseEther("100");
      await lpToken
        .connect(user1)
        .approve(await lpVault.getAddress(), depositAmount);
      await lpVault.connect(user1).deposit(depositAmount);

      await lpToken
        .connect(user2)
        .approve(await lpVault.getAddress(), depositAmount);
      await lpVault.connect(user2).deposit(depositAmount);
    });

    it("Should distribute rewards proportionally", async function () {
      const rewardAmount = ethers.parseUnits("1000", 6); // 1000 USDC

      // Distribute rewards
      await usdc.approve(await lpVault.getAddress(), rewardAmount);
      await lpVault.notifyRewardAmount(rewardAmount);

      // Check pending rewards (should be equal for equal deposits)
      const user1Pending = await lpVault.pendingRewards(user1.address);
      const user2Pending = await lpVault.pendingRewards(user2.address);

      expect(user1Pending).to.be.approximately(
        user2Pending,
        ethers.parseUnits("1", 6)
      );
      expect(user1Pending).to.be.approximately(
        rewardAmount / 2n,
        ethers.parseUnits("1", 6)
      );
    });

    it("Should claim rewards correctly", async function () {
      const rewardAmount = ethers.parseUnits("1000", 6);

      // Distribute rewards
      await usdc.approve(await lpVault.getAddress(), rewardAmount);
      await lpVault.notifyRewardAmount(rewardAmount);

      // Claim rewards
      const initialBalance = await usdc.balanceOf(user1.address);
      await expect(lpVault.connect(user1).claimRewards()).to.emit(
        lpVault,
        "Claim"
      );

      const finalBalance = await usdc.balanceOf(user1.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });
  });
});
```

```javascript
// test/HarpoonFactory.test.js
describe("HarpoonFactory", function () {
  let harpoonFactory, surfNFT, mumuNFT, ccipRouter;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

    // Deploy mock NFTs
    const MockNFT = await ethers.getContractFactory("MockNFT");
    surfNFT = await MockNFT.deploy("SURF Board", "SURF");
    mumuNFT = await MockNFT.deploy("mumu-frens", "MUMU");

    // Deploy mock CCIP router
    const MockCCIPRouter = await ethers.getContractFactory("MockCCIPRouter");
    ccipRouter = await MockCCIPRouter.deploy();

    // Deploy HarpoonFactory
    const HarpoonFactory = await ethers.getContractFactory("HarpoonFactory");
    harpoonFactory = await HarpoonFactory.deploy(
      await ccipRouter.getAddress(),
      5009297550715157269, // Ethereum chain selector
      await surfNFT.getAddress(),
      await mumuNFT.getAddress(),
      owner.address
    );

    // Mint NFTs to users
    await surfNFT.mint(user1.address, 1);
    await mumuNFT.mint(user2.address, 1);
  });

  describe("Harpoon Creation", function () {
    it("Should create harpoon for NFT holder", async function () {
      const params = {
        targetToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // WETH
        collateralAmount: ethers.parseUnits("1000", 6), // $1000
        leverage: 5,
        isLong: true,
        slippageBps: 50, // 0.5%
        platform: "GMX",
        duration: 7 * 24 * 3600, // 7 days
        platformSpecificData: "0x",
      };

      const creationFee = await harpoonFactory.creationFee();

      await expect(
        harpoonFactory
          .connect(user1)
          .createHarpoon(params, { value: creationFee })
      ).to.emit(harpoonFactory, "HarpoonCreated");

      // Check harpoon count
      expect(await harpoonFactory.harpoonCount()).to.equal(1);

      // Check user harpoons
      const userHarpoons = await harpoonFactory.getUserHarpoons(user1.address);
      expect(userHarpoons.length).to.equal(1);
    });

    it("Should reject creation for non-NFT holder", async function () {
      const params = {
        targetToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        collateralAmount: ethers.parseUnits("1000", 6),
        leverage: 5,
        isLong: true,
        slippageBps: 50,
        platform: "GMX",
        duration: 7 * 24 * 3600,
        platformSpecificData: "0x",
      };

      const creationFee = await harpoonFactory.creationFee();

      // User without NFT
      const [, , user3] = await ethers.getSigners();

      await expect(
        harpoonFactory
          .connect(user3)
          .createHarpoon(params, { value: creationFee })
      ).to.be.revertedWith("No eligible NFT");
    });
  });
});
```

### Integration Tests

```javascript
// test/integration/CrossChain.test.js
describe("Cross-Chain Integration", function () {
  let lpVault, ccipBridge, harpoonFactory, mockCCIP;

  beforeEach(async function () {
    // Deploy full system
    // ... setup code
  });

  it("Should handle end-to-end cross-chain harpoon creation", async function () {
    // 1. User deposits LP tokens on Ethereum
    await lpToken
      .connect(user1)
      .approve(await lpVault.getAddress(), depositAmount);
    await lpVault.connect(user1).deposit(depositAmount);

    // 2. User requests harpoon creation via CCIP bridge
    const harpoonParams = {
      targetToken: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      collateralAmount: ethers.parseUnits("1000", 6),
      leverage: 5,
      isLong: true,
      slippageBps: 50,
      platform: "GMX",
      duration: 7 * 24 * 3600,
      platformSpecificData: "0x",
    };

    const fee = await ccipBridge.calculateFee(harpoonParams);
    await ccipBridge
      .connect(user1)
      .requestHarpoonCreation(harpoonParams, { value: fee });

    // 3. Simulate CCIP message delivery to Arbitrum
    // ... mock CCIP delivery

    // 4. Verify harpoon was created on Arbitrum
    const harpoonCount = await harpoonFactory.harpoonCount();
    expect(harpoonCount).to.equal(1);
  });
});
```

### Stress Tests

```javascript
// test/stress/LoadTest.test.js
describe("Load Testing", function () {
  it("Should handle 100 concurrent deposits", async function () {
    const users = [];
    const depositPromises = [];

    // Create 100 users
    for (let i = 0; i < 100; i++) {
      const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
      users.push(wallet);

      // Fund user
      await owner.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther("1"),
      });
      await lpToken.transfer(wallet.address, ethers.parseEther("100"));
    }

    // Execute concurrent deposits
    for (const user of users) {
      depositPromises.push(async () => {
        await lpToken
          .connect(user)
          .approve(await lpVault.getAddress(), ethers.parseEther("100"));
        await lpVault.connect(user).deposit(ethers.parseEther("100"));
      });
    }

    await Promise.all(depositPromises.map((fn) => fn()));

    // Verify total deposits
    expect(await lpVault.totalShares()).to.equal(ethers.parseEther("10000"));
  });
});
```

## Deployment Scripts

### 1. Ethereum Deployment

```javascript
// scripts/deploy-ethereum.js
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying to Ethereum with account:", deployer.address);

  // Contract addresses
  const ADDRESSES = {
    surfLPToken: "0x...", // SURF/WETH LP token
    usdc: "0xA0b86a33E6B84f4B7237D33b4f9F36dcb8Db37E8",
    ccipRouter: "0x80226fc0Ee2b096224EeAc085Bb9a8cba1146f7D",
    surfBoardNFT: "0x...",
    mumuFrensNFT: "0x...",
    feeRecipient: deployer.address,
  };

  // Deploy LPVault
  console.log("Deploying LPVault...");
  const LPVault = await ethers.getContractFactory("LPVault");
  const lpVault = await LPVault.deploy(
    ADDRESSES.surfLPToken,
    ADDRESSES.usdc,
    ADDRESSES.feeRecipient
  );
  await lpVault.waitForDeployment();
  console.log("LPVault deployed to:", await lpVault.getAddress());

  // Deploy CCIPBridge
  console.log("Deploying CCIPBridge...");
  const CCIPBridge = await ethers.getContractFactory("CCIPBridge");
  const ccipBridge = await CCIPBridge.deploy(
    ADDRESSES.ccipRouter,
    4949039107694359620, // Arbitrum chain selector
    ADDRESSES.surfBoardNFT,
    ADDRESSES.mumuFrensNFT,
    ADDRESSES.feeRecipient
  );
  await ccipBridge.waitForDeployment();
  console.log("CCIPBridge deployed to:", await ccipBridge.getAddress());

  // Configure bridge
  await ccipBridge.setLPVault(await lpVault.getAddress());
  console.log("Bridge configured with LPVault");

  // Verify contracts
  if (network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await lpVault.deploymentTransaction().wait(5);
    await ccipBridge.deploymentTransaction().wait(5);

    await hre.run("verify:verify", {
      address: await lpVault.getAddress(),
      constructorArguments: [
        ADDRESSES.surfLPToken,
        ADDRESSES.usdc,
        ADDRESSES.feeRecipient,
      ],
    });

    await hre.run("verify:verify", {
      address: await ccipBridge.getAddress(),
      constructorArguments: [
        ADDRESSES.ccipRouter,
        4949039107694359620,
        ADDRESSES.surfBoardNFT,
        ADDRESSES.mumuFrensNFT,
        ADDRESSES.feeRecipient,
      ],
    });
  }

  console.log("Deployment complete!");
  console.log("LPVault:", await lpVault.getAddress());
  console.log("CCIPBridge:", await ccipBridge.getAddress());
}

main().catch(console.error);
```

### 2. Arbitrum Deployment

```javascript
// scripts/deploy-arbitrum.js
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying to Arbitrum with account:", deployer.address);

  const ADDRESSES = {
    ccipRouter: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
    surfBoardNFT: "0x...", // Deployed/bridged to Arbitrum
    mumuFrensNFT: "0x...", // Deployed/bridged to Arbitrum
    gmxRouter: "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064",
    uniswapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    feeRecipient: deployer.address,
  };

  // Deploy HarpoonFactory
  console.log("Deploying HarpoonFactory...");
  const HarpoonFactory = await ethers.getContractFactory("HarpoonFactory");
  const harpoonFactory = await HarpoonFactory.deploy(
    ADDRESSES.ccipRouter,
    5009297550715157269, // Ethereum chain selector
    ADDRESSES.surfBoardNFT,
    ADDRESSES.mumuFrensNFT,
    ADDRESSES.feeRecipient
  );
  await harpoonFactory.waitForDeployment();
  console.log("HarpoonFactory deployed to:", await harpoonFactory.getAddress());

  // Configure platforms
  await harpoonFactory.addPlatform("GMX", ADDRESSES.gmxRouter);
  await harpoonFactory.addPlatform("UNISWAP", ADDRESSES.uniswapRouter);
  console.log("Trading platforms configured");

  // Get Harpoon implementation address
  const harpoonImpl = await harpoonFactory.harpoonImplementation();
  console.log("Harpoon implementation:", harpoonImpl);

  // Verify contracts
  if (network.name !== "localhost") {
    console.log("Waiting for block confirmations...");
    await harpoonFactory.deploymentTransaction().wait(5);

    await hre.run("verify:verify", {
      address: await harpoonFactory.getAddress(),
      constructorArguments: [
        ADDRESSES.ccipRouter,
        5009297550715157269,
        ADDRESSES.surfBoardNFT,
        ADDRESSES.mumuFrensNFT,
        ADDRESSES.feeRecipient,
      ],
    });
  }

  console.log("Deployment complete!");
  console.log("HarpoonFactory:", await harpoonFactory.getAddress());
  console.log("Harpoon Implementation:", harpoonImpl);
}

main().catch(console.error);
```

### 3. Cross-Chain Configuration

```javascript
// scripts/configure-crosschain.js
async function main() {
  const ETHEREUM_ADDRESSES = {
    ccipBridge: "0x...", // From Ethereum deployment
  };

  const ARBITRUM_ADDRESSES = {
    harpoonFactory: "0x...", // From Arbitrum deployment
  };

  // Configure Ethereum side
  console.log("Configuring Ethereum bridge...");
  const ccipBridge = await ethers.getContractAt(
    "CCIPBridge",
    ETHEREUM_ADDRESSES.ccipBridge
  );
  await ccipBridge.setRemoteContract(ARBITRUM_ADDRESSES.harpoonFactory);

  // Switch to Arbitrum network for next configuration
  // (In practice, this would be done with separate scripts or manual process)

  console.log("Cross-chain configuration complete!");
}

main().catch(console.error);
```

## Security Checklist

### Pre-Deployment Security Review

- [ ] **Access Controls**
  - [ ] All admin functions are properly protected
  - [ ] Multi-sig is configured for critical operations
  - [ ] Role-based access is correctly implemented
- [ ] **Smart Contract Security**
  - [ ] Reentrancy guards on all external calls
  - [ ] Integer overflow/underflow protection
  - [ ] Proper input validation on all functions
  - [ ] Emergency pause mechanisms implemented
- [ ] **Cross-Chain Security**
  - [ ] CCIP message authentication verified
  - [ ] Replay attack protection implemented
  - [ ] Rate limiting on cross-chain calls
  - [ ] Timeout mechanisms for stale messages
- [ ] **Economic Security**
  - [ ] Slippage protection mechanisms
  - [ ] Position size limits implemented
  - [ ] Liquidation logic properly tested
  - [ ] Fee structures reviewed
- [ ] **Oracle and Price Feed Security**
  - [ ] Price feed manipulation protection
  - [ ] Circuit breakers for extreme price movements
  - [ ] Multiple oracle sources where possible

### Post-Deployment Monitoring

```javascript
// monitoring/security-monitor.js
class SecurityMonitor {
  constructor(contracts, alertConfig) {
    this.contracts = contracts;
    this.alertConfig = alertConfig;
  }

  async monitorLargeDeposits() {
    const filter = this.contracts.lpVault.filters.Deposit();

    this.contracts.lpVault.on(filter, (user, amount, shares, event) => {
      const amountUSD =
        parseFloat(ethers.formatEther(amount)) * this.alertConfig.lpTokenPrice;

      if (amountUSD > this.alertConfig.largeDepositThreshold) {
        this.sendAlert(`Large deposit detected: ${amountUSD} USD from ${user}`);
      }
    });
  }

  async monitorHighLeverageHarpoons() {
    const filter = this.contracts.harpoonFactory.filters.HarpoonCreated();

    this.contracts.harpoonFactory.on(
      filter,
      async (id, harpoon, creator, params) => {
        if (params.leverage > this.alertConfig.highLeverageThreshold) {
          this.sendAlert(
            `High leverage harpoon created: ${params.leverage}x by ${creator}`
          );
        }
      }
    );
  }

  async monitorCCIPMessages() {
    const filter = this.contracts.ccipBridge.filters.MessageSent();

    this.contracts.ccipBridge.on(
      filter,
      (messageId, sender, chain, selector, data) => {
        // Log all cross-chain messages for audit trail
        console.log(`CCIP Message: ${messageId} from ${sender}`);
      }
    );
  }

  sendAlert(message) {
    console.log(`🚨 SECURITY ALERT: ${message}`);
    // Integrate with monitoring services (PagerDuty, Slack, etc.)
  }
}
```

## Monitoring & Maintenance

### Health Check Dashboard

```javascript
// monitoring/health-check.js
class ProtocolHealthCheck {
  constructor(contracts) {
    this.contracts = contracts;
  }

  async checkSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      ethereum: await this.checkEthereumHealth(),
      arbitrum: await this.checkArbitrumHealth(),
      crossChain: await this.checkCrossChainHealth(),
    };

    return health;
  }

  async checkEthereumHealth() {
    try {
      const lpVault = this.contracts.lpVault;
      const ccipBridge = this.contracts.ccipBridge;

      const [totalShares, lpBalance, totalRewards] = await Promise.all([
        lpVault.totalShares(),
        lpVault.lpBalance(),
        lpVault.totalRewardsDistributed(),
      ]);

      return {
        status: "healthy",
        totalShares: ethers.formatEther(totalShares),
        lpBalance: ethers.formatEther(lpBalance),
        totalRewards: ethers.formatUnits(totalRewards, 6),
        bridgeOperational: await this.testBridgeConnectivity(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  async checkArbitrumHealth() {
    try {
      const factory = this.contracts.harpoonFactory;

      const [totalHarpoons, activeHarpoons] = await Promise.all([
        factory.harpoonCount(),
        this.countActiveHarpoons(),
      ]);

      return {
        status: "healthy",
        totalHarpoons: Number(totalHarpoons),
        activeHarpoons,
        avgGasPrice: await this.getAverageGasPrice(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        error: error.message,
      };
    }
  }

  async checkCrossChainHealth() {
    // Test CCIP connectivity and latency
    const startTime = Date.now();
    try {
      // Perform a test message or query
      const canSend = await this.contracts.ccipBridge.canSendMessage(
        "0x0000000000000000000000000000000000000001"
      );
      const latency = Date.now() - startTime;

      return {
        status: "healthy",
        latency: `${latency}ms`,
        ccipOperational: true,
      };
    } catch (error) {
      return {
        status: "unhealthy",
        latency: `${Date.now() - startTime}ms`,
        error: error.message,
      };
    }
  }

  async countActiveHarpoons() {
    const totalCount = await this.contracts.harpoonFactory.harpoonCount();
    let activeCount = 0;

    for (let i = 0; i < totalCount; i++) {
      const harpoonAddr = await this.contracts.harpoonFactory.getHarpoon(i);
      const harpoon = new ethers.Contract(
        harpoonAddr,
        ["function status() view returns (uint8)"],
        this.contracts.provider
      );
      const status = await harpoon.status();
      if (status === 1) activeCount++; // Status.Open
    }

    return activeCount;
  }
}
```

### Maintenance Scripts

```javascript
// scripts/maintenance/cleanup-expired.js
async function cleanupExpiredHarpoons() {
  const harpoonFactory = await ethers.getContractAt(
    "HarpoonFactory",
    FACTORY_ADDRESS
  );
  const totalCount = await harpoonFactory.harpoonCount();

  console.log(`Checking ${totalCount} harpoons for expiry...`);

  for (let i = 0; i < totalCount; i++) {
    try {
      const harpoonAddr = await harpoonFactory.getHarpoon(i);
      const harpoon = await ethers.getContractAt("Harpoon", harpoonAddr);

      const status = await harpoon.status();
      if (status === 1) {
        // Open
        const [, , , , openTime] = await harpoon.getPositionDetails();
        const duration = await harpoon.params().duration;

        if (Date.now() / 1000 > Number(openTime) + Number(duration)) {
          console.log(`Closing expired harpoon ${i} at ${harpoonAddr}`);
          await harpoon.closeExpiredPosition();
        }
      }
    } catch (error) {
      console.error(`Error processing harpoon ${i}:`, error.message);
    }
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Cross-Chain Message Failures

**Symptoms**: Harpoon creation requests fail silently
**Diagnosis**:

```javascript
// Check message status
const messageStatus = await ccipBridge.getMessageStatus(messageId);
console.log("Message status:", messageStatus);

// Check CCIP fee calculation
const fee = await ccipBridge.calculateFee(params);
console.log("Required fee:", ethers.formatEther(fee));
```

**Solutions**:

- Verify sufficient ETH balance for CCIP fees
- Check remote contract configuration
- Validate message size limits
- Retry with exponential backoff

#### 2. LP Reward Distribution Issues

**Symptoms**: Rewards not accumulating properly
**Diagnosis**:

```javascript
// Check vault state
const accPerShare = await lpVault.accUSDCPerShare();
const totalShares = await lpVault.totalShares();
const lastRewardBlock = await lpVault.lastRewardBlock();

console.log("Accumulated per share:", accPerShare);
console.log("Total shares:", totalShares);
console.log("Last reward block:", lastRewardBlock);
```

**Solutions**:

- Verify reward distributor permissions
- Check USDC token approvals
- Ensure notifyRewardAmount is called regularly

#### 3. Harpoon Position Management

**Symptoms**: Positions stuck in pending state
**Diagnosis**:

```javascript
// Check harpoon status
const harpoon = await ethers.getContractAt("Harpoon", harpoonAddress);
const status = await harpoon.status();
const creator = await harpoon.creator();

console.log("Status:", ["Pending", "Open", "Closed", "Liquidated"][status]);
console.log("Creator:", creator);
```

**Solutions**:

- Call openPosition() if in pending state
- Check platform router configurations
- Verify collateral token approvals

### Emergency Procedures

#### 1. Pause Protocol

```javascript
// scripts/emergency/pause-protocol.js
async function emergencyPause() {
  const [admin] = await ethers.getSigners();

  // Pause Ethereum contracts
  const lpVault = await ethers.getContractAt("LPVault", LP_VAULT_ADDRESS);
  await lpVault.pause();

  const ccipBridge = await ethers.getContractAt("CCIPBridge", BRIDGE_ADDRESS);
  await ccipBridge.pause();

  // Pause Arbitrum contracts
  const harpoonFactory = await ethers.getContractAt(
    "HarpoonFactory",
    FACTORY_ADDRESS
  );
  await harpoonFactory.pause();

  console.log("Protocol paused successfully");
}
```

#### 2. Emergency Withdraw

```javascript
// scripts/emergency/emergency-withdraw.js
async function emergencyWithdraw(tokenAddress, amount) {
  const [admin] = await ethers.getSigners();

  const lpVault = await ethers.getContractAt("LPVault", LP_VAULT_ADDRESS);
  await lpVault.recoverToken(tokenAddress, amount);

  console.log(`Recovered ${amount} tokens from ${tokenAddress}`);
}
```

### Performance Optimization

#### Gas Optimization Tips

1. **Batch Operations**: Group multiple calls into single transaction
2. **Efficient Storage**: Use packed structs and minimize storage writes
3. **Event Indexing**: Use indexed parameters for important filtering
4. **View Functions**: Cache frequently accessed data

#### Monitoring Best Practices

1. **Real-time Alerts**: Set up monitoring for large transactions
2. **Gas Price Tracking**: Monitor and adjust for network congestion
3. **Cross-chain Latency**: Track CCIP message delivery times
4. **Oracle Monitoring**: Watch for price feed anomalies

---

This comprehensive testing and deployment guide provides everything needed to safely deploy, monitor, and maintain the LP Incentive Protocol in production environments.
