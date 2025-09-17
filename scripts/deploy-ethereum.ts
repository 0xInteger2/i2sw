// scripts/deploy-ethereum.ts
import { ethers } from "hardhat";
const fs = require("fs");

async function deployEthereum() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Ethereum contracts with account:", deployer.address);

  // Get deployment configuration
  const ConfigFactory = await ethers.getContractFactory("DeploymentConfig");
  const isMainnet = process.env.NETWORK === "mainnet";

  // Deploy only the contracts needed for Ethereum
  console.log("Deploying LPVault...");
  const LPVault = await ethers.getContractFactory("LPVault");
  const lpVault = await LPVault.deploy(
    process.env.LP_TOKEN_ADDRESS || ethers.ZeroAddress,
    process.env.USDC_ADDRESS || ethers.ZeroAddress,
    process.env.FEE_RECIPIENT || deployer.address
  );
  await lpVault.waitForDeployment();
  console.log("LPVault deployed to:", await lpVault.getAddress());

  console.log("Deploying CCIPBridge...");
  const CCIPBridge = await ethers.getContractFactory("CCIPBridge");
  const ccipBridge = await CCIPBridge.deploy(
    process.env.CCIP_ROUTER_ADDRESS || ethers.ZeroAddress,
    process.env.ARBITRUM_CHAIN_SELECTOR || "4949039107694359620",
    process.env.SURF_BOARD_NFT || ethers.ZeroAddress,
    process.env.MUMU_FRENS_NFT || ethers.ZeroAddress,
    process.env.FEE_RECIPIENT || deployer.address
  );
  await ccipBridge.waitForDeployment();
  console.log("CCIPBridge deployed to:", await ccipBridge.getAddress());

  // Configure bridge with LPVault
  await ccipBridge.setLPVault(await lpVault.getAddress());
  console.log("Bridge configured with LPVault");

  // Save deployment addresses
  const fs = require("fs");
  const deploymentData = {
    network: "ethereum",
    contracts: {
      lpVault: await lpVault.getAddress(),
      ccipBridge: await ccipBridge.getAddress(),
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    `deployments/ethereum-${Date.now()}.json`,
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("Deployment complete! Addresses saved to deployments/");
}

deployEthereum()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// scripts/deploy-arbitrum.ts
import { ethers } from "hardhat";

async function deployArbitrum() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying Arbitrum contracts with account:", deployer.address);

  // Deploy HarpoonFactory
  console.log("Deploying HarpoonFactory...");
  const HarpoonFactory = await ethers.getContractFactory("HarpoonFactory");
  const harpoonFactory = await HarpoonFactory.deploy(
    process.env.CCIP_ROUTER_ADDRESS || ethers.ZeroAddress,
    process.env.ETHEREUM_CHAIN_SELECTOR || "5009297550715157269",
    process.env.SURF_BOARD_NFT || ethers.ZeroAddress,
    process.env.MUMU_FRENS_NFT || ethers.ZeroAddress,
    process.env.FEE_RECIPIENT || deployer.address
  );
  await harpoonFactory.waitForDeployment();
  console.log("HarpoonFactory deployed to:", await harpoonFactory.getAddress());

  // Configure trading platforms
  const gmxRouter =
    process.env.GMX_ROUTER || "0xaBBc5F99639c9B6bCb58544ddf04EFA6802F4064";
  const uniswapRouter =
    process.env.UNISWAP_ROUTER || "0xE592427A0AEce92De3Edee1F18E0157C05861564";

  await harpoonFactory.addPlatform("GMX", gmxRouter);
  await harpoonFactory.addPlatform("UNISWAP", uniswapRouter);
  console.log("Trading platforms configured");

  // Get Harpoon implementation address
  const harpoonImpl = await harpoonFactory.harpoonImplementation();
  console.log("Harpoon implementation:", harpoonImpl);

  // Save deployment addresses
  const fs = require("fs");
  const deploymentData = {
    network: "arbitrum",
    contracts: {
      harpoonFactory: await harpoonFactory.getAddress(),
      harpoonImplementation: harpoonImpl,
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    `deployments/arbitrum-${Date.now()}.json`,
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("Deployment complete! Addresses saved to deployments/");
}

deployArbitrum()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// scripts/deploy-testnet.ts
import { ethers } from "hardhat";

async function deployTestnet() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying testnet contracts with account:", deployer.address);

  // Deploy mock tokens first
  console.log("Deploying mock tokens...");

  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const mockUSDC = await MockERC20.deploy(
    "Mock USDC",
    "mUSDC",
    6,
    ethers.parseUnits("1000000", 6) // 1M USDC
  );
  await mockUSDC.waitForDeployment();
  console.log("Mock USDC deployed to:", await mockUSDC.getAddress());

  const mockLPToken = await MockERC20.deploy(
    "Mock SURF/WETH LP",
    "mSURF-LP",
    18,
    ethers.parseEther("1000000") // 1M LP tokens
  );
  await mockLPToken.waitForDeployment();
  console.log("Mock LP Token deployed to:", await mockLPToken.getAddress());

  const MockNFT = await ethers.getContractFactory("MockNFT");
  const mockSurfNFT = await MockNFT.deploy("Mock SURF Board", "mSURF");
  await mockSurfNFT.waitForDeployment();
  console.log("Mock SURF NFT deployed to:", await mockSurfNFT.getAddress());

  const mockMumuNFT = await MockNFT.deploy("Mock mumu-frens", "mMUMU");
  await mockMumuNFT.waitForDeployment();
  console.log("Mock mumu NFT deployed to:", await mockMumuNFT.getAddress());

  // Deploy core contracts
  console.log("\nDeploying core contracts...");

  const LPVault = await ethers.getContractFactory("LPVault");
  const lpVault = await LPVault.deploy(
    await mockLPToken.getAddress(),
    await mockUSDC.getAddress(),
    deployer.address
  );
  await lpVault.waitForDeployment();
  console.log("LPVault deployed to:", await lpVault.getAddress());

  const CCIPBridge = await ethers.getContractFactory("CCIPBridge");
  const ccipBridge = await CCIPBridge.deploy(
    process.env.CCIP_ROUTER_TESTNET || ethers.ZeroAddress,
    "3478487238524512106", // Arbitrum Sepolia selector
    await mockSurfNFT.getAddress(),
    await mockMumuNFT.getAddress(),
    deployer.address
  );
  await ccipBridge.waitForDeployment();
  console.log("CCIPBridge deployed to:", await ccipBridge.getAddress());

  const HarpoonFactory = await ethers.getContractFactory("HarpoonFactory");
  const harpoonFactory = await HarpoonFactory.deploy(
    process.env.CCIP_ROUTER_TESTNET || ethers.ZeroAddress,
    "16015286601757825753", // Sepolia selector
    await mockSurfNFT.getAddress(),
    await mockMumuNFT.getAddress(),
    deployer.address
  );
  await harpoonFactory.waitForDeployment();
  console.log("HarpoonFactory deployed to:", await harpoonFactory.getAddress());

  // Deploy ProtocolManager for monitoring
  const ProtocolManager = await ethers.getContractFactory("ProtocolManager");
  const protocolManager = await ProtocolManager.deploy(
    await lpVault.getAddress(),
    await ccipBridge.getAddress(),
    await harpoonFactory.getAddress()
  );
  await protocolManager.waitForDeployment();
  console.log(
    "ProtocolManager deployed to:",
    await protocolManager.getAddress()
  );

  // Configure contracts
  console.log("\nConfiguring contracts...");
  await ccipBridge.setLPVault(await lpVault.getAddress());
  await ccipBridge.setRemoteContract(await harpoonFactory.getAddress());
  await harpoonFactory.setTrustedEthereumSender(await ccipBridge.getAddress());

  // Add mock platform routers
  await harpoonFactory.addPlatform("GMX", ethers.ZeroAddress);
  await harpoonFactory.addPlatform("UNISWAP", ethers.ZeroAddress);

  // Mint some test tokens to deployer
  console.log("\nMinting test tokens...");
  await mockUSDC.mint(deployer.address, ethers.parseUnits("10000", 6));
  await mockLPToken.mint(deployer.address, ethers.parseEther("1000"));
  await mockSurfNFT.mint(deployer.address, 1);
  await mockMumuNFT.mint(deployer.address, 1);

  // Save all addresses
  const fs = require("fs");
  const deploymentData = {
    network: "testnet",
    mockTokens: {
      mockUSDC: await mockUSDC.getAddress(),
      mockLPToken: await mockLPToken.getAddress(),
      mockSurfNFT: await mockSurfNFT.getAddress(),
      mockMumuNFT: await mockMumuNFT.getAddress(),
    },
    contracts: {
      lpVault: await lpVault.getAddress(),
      ccipBridge: await ccipBridge.getAddress(),
      harpoonFactory: await harpoonFactory.getAddress(),
      protocolManager: await protocolManager.getAddress(),
      harpoonImplementation: await harpoonFactory.harpoonImplementation(),
    },
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    `deployments/testnet-${Date.now()}.json`,
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\nTestnet deployment complete!");
  console.log("Addresses saved to deployments/");

  return deploymentData;
}

deployTestnet()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
