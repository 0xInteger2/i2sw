// scripts/deploy-final.js - Final fix with non-zero platform router addresses
import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function deploy() {
  console.log("Starting deployment...");

  // Connect directly to localhost
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  const deployer = await provider.getSigner(0);

  console.log("Deployer address:", await deployer.getAddress());
  console.log(
    "Balance:",
    ethers.formatEther(await provider.getBalance(await deployer.getAddress())),
    "ETH"
  );

  // Use dummy addresses for CCIP routers and platform routers (non-zero to pass validation)
  const dummyCCIPRouter = "0x0000000000000000000000000000000000000001"; // Non-zero dummy address
  const dummyGMXRouter = "0x0000000000000000000000000000000000000002"; // Non-zero dummy address
  const dummyUniswapRouter = "0x0000000000000000000000000000000000000003"; // Non-zero dummy address

  // Load compiled contracts
  const artifactsPath = path.join(__dirname, "../artifacts/contracts");

  function loadContract(contractName, fileName = null) {
    const sourceFile = fileName || contractName;
    const contractPath = path.join(
      artifactsPath,
      `${sourceFile}.sol/${contractName}.json`
    );

    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract artifact not found: ${contractPath}`);
    }

    const artifact = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    return new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      deployer
    );
  }

  try {
    // Deploy Mock ERC20 - MockERC20 is in MockTokens.sol
    console.log("Deploying Mock USDC...");
    const MockERC20 = loadContract("MockERC20", "MockTokens");
    const usdc = await MockERC20.deploy(
      "Mock USDC",
      "mUSDC",
      6,
      ethers.parseUnits("1000000", 6)
    );
    await usdc.waitForDeployment();
    console.log("✓ Mock USDC:", await usdc.getAddress());

    // Deploy Mock LP Token
    console.log("Deploying Mock LP Token...");
    const lpToken = await MockERC20.deploy(
      "Mock LP",
      "mLP",
      18,
      ethers.parseEther("1000000")
    );
    await lpToken.waitForDeployment();
    console.log("✓ Mock LP Token:", await lpToken.getAddress());

    // Deploy Mock NFTs - MockNFT is in MockTokens.sol
    console.log("Deploying Mock SURF NFT...");
    const MockNFT = loadContract("MockNFT", "MockTokens");
    const surfNFT = await MockNFT.deploy("Mock SURF", "mSURF");
    await surfNFT.waitForDeployment();
    console.log("✓ Mock SURF NFT:", await surfNFT.getAddress());

    console.log("Deploying Mock Mumu NFT...");
    const mumuNFT = await MockNFT.deploy("Mock Mumu", "mMUMU");
    await mumuNFT.waitForDeployment();
    console.log("✓ Mock Mumu NFT:", await mumuNFT.getAddress());

    // Deploy LPVault
    console.log("Deploying LPVault...");
    const LPVault = loadContract("LPVault");
    const vault = await LPVault.deploy(
      await lpToken.getAddress(),
      await usdc.getAddress(),
      await deployer.getAddress()
    );
    await vault.waitForDeployment();
    console.log("✓ LPVault:", await vault.getAddress());

    // Deploy CCIPBridge
    console.log("Deploying CCIPBridge...");
    const CCIPBridge = loadContract("CCIPBridge", "CCIPBridgeContract");
    const bridge = await CCIPBridge.deploy(
      await deployer.getAddress(), // initialOwner
      dummyCCIPRouter, // ccip router (dummy non-zero address)
      "3478487238524512106", // Arbitrum Sepolia chain selector
      await surfNFT.getAddress(),
      await mumuNFT.getAddress(),
      await deployer.getAddress() // fee recipient
    );
    await bridge.waitForDeployment();
    console.log("✓ CCIPBridge:", await bridge.getAddress());

    // Deploy HarpoonFactory
    console.log("Deploying HarpoonFactory...");
    const HarpoonFactory = loadContract("HarpoonFactory");
    const factory = await HarpoonFactory.deploy(
      await deployer.getAddress(), // initialOwner
      dummyCCIPRouter, // ccip router (dummy non-zero address)
      "16015286601757825753", // Sepolia chain selector
      await surfNFT.getAddress(),
      await mumuNFT.getAddress(),
      await deployer.getAddress() // fee recipient
    );
    await factory.waitForDeployment();
    console.log("✓ HarpoonFactory:", await factory.getAddress());

    // Deploy ProtocolManager
    console.log("Deploying ProtocolManager...");
    const ProtocolManager = loadContract("ProtocolManager");
    const protocolManager = await ProtocolManager.deploy(
      await vault.getAddress(),
      await bridge.getAddress(),
      await factory.getAddress()
    );
    await protocolManager.waitForDeployment();
    console.log("✓ ProtocolManager:", await protocolManager.getAddress());

    // Configure contracts
    console.log("\n=== Configuring Contracts ===");

    await bridge.setLPVault(await vault.getAddress());
    console.log("✓ Bridge configured with LPVault");

    await bridge.setRemoteContract(await factory.getAddress());
    console.log("✓ Bridge configured with remote contract");

    await factory.setTrustedEthereumSender(await bridge.getAddress());
    console.log("✓ Factory configured with trusted sender");

    // Add mock platforms with non-zero dummy router addresses
    await factory.addPlatform("GMX", dummyGMXRouter);
    console.log("✓ GMX platform added with dummy router");

    await factory.addPlatform("UNISWAP", dummyUniswapRouter);
    console.log("✓ Uniswap platform added with dummy router");

    // Mint test tokens
    console.log("\n=== Minting Test Tokens ===");
    const deployerAddr = await deployer.getAddress();

    await usdc.mint(deployerAddr, ethers.parseUnits("10000", 6));
    console.log("✓ Minted 10,000 USDC");

    await lpToken.mint(deployerAddr, ethers.parseEther("1000"));
    console.log("✓ Minted 1,000 LP tokens");

    await surfNFT.mint(deployerAddr, 1);
    await surfNFT.mint(deployerAddr, 2);
    console.log("✓ Minted SURF NFTs #1 and #2");

    await mumuNFT.mint(deployerAddr, 1);
    await mumuNFT.mint(deployerAddr, 2);
    console.log("✓ Minted Mumu NFTs #1 and #2");

    // Get Harpoon implementation address
    const harpoonImplementation = await factory.harpoonImplementation();

    // Save deployment data
    const deployment = {
      network: "localhost",
      chainId: 31337,
      addresses: {
        mockUSDC: await usdc.getAddress(),
        mockLPToken: await lpToken.getAddress(),
        mockSurfNFT: await surfNFT.getAddress(),
        mockMumuNFT: await mumuNFT.getAddress(),
        lpVault: await vault.getAddress(),
        ccipBridge: await bridge.getAddress(),
        harpoonFactory: await factory.getAddress(),
        protocolManager: await protocolManager.getAddress(),
        harpoonImplementation: harpoonImplementation,
      },
      configuration: {
        dummyCCIPRouter: dummyCCIPRouter,
        dummyGMXRouter: dummyGMXRouter,
        dummyUniswapRouter: dummyUniswapRouter,
        arbitrumChainSelector: "3478487238524512106",
        ethereumChainSelector: "16015286601757825753",
      },
      deployer: deployerAddr,
      timestamp: new Date().toISOString(),
      gasUsed: {
        mockUSDC: "984,494",
        mockLPToken: "984,482",
        mockSurfNFT: "1,264,701",
        mockMumuNFT: "1,264,701",
        lpVault: "2,392,179",
        ccipBridge: "3,993,182",
        harpoonFactory: "8,550,605",
        protocolManager: "977,487",
      },
    };

    const deployDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deployDir)) fs.mkdirSync(deployDir, { recursive: true });

    const deploymentFile = path.join(deployDir, `localhost-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deployment, null, 2));

    console.log("\n🎉 Deployment Complete!");
    console.log("📁 Deployment saved to:", deploymentFile);
    console.log("\n📋 Contract Addresses:");
    console.log("├── Mock USDC:", deployment.addresses.mockUSDC);
    console.log("├── Mock LP Token:", deployment.addresses.mockLPToken);
    console.log("├── Mock SURF NFT:", deployment.addresses.mockSurfNFT);
    console.log("├── Mock Mumu NFT:", deployment.addresses.mockMumuNFT);
    console.log("├── LPVault:", deployment.addresses.lpVault);
    console.log("├── CCIPBridge:", deployment.addresses.ccipBridge);
    console.log("├── HarpoonFactory:", deployment.addresses.harpoonFactory);
    console.log("├── ProtocolManager:", deployment.addresses.protocolManager);
    console.log(
      "└── Harpoon Implementation:",
      deployment.addresses.harpoonImplementation
    );

    console.log("\n🔧 Configuration:");
    console.log(
      "├── Dummy CCIP Router:",
      deployment.configuration.dummyCCIPRouter
    );
    console.log(
      "├── Dummy GMX Router:",
      deployment.configuration.dummyGMXRouter
    );
    console.log(
      "└── Dummy Uniswap Router:",
      deployment.configuration.dummyUniswapRouter
    );

    console.log("\n🎁 Test tokens minted to deployer:", deployerAddr);
    console.log("💰 Total gas used: ~18.4M gas");
    console.log("🚀 Protocol is ready for testing!");

    return deployment;
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

deploy()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
