// scripts/deploy-task.ts - Alternative approach using Hardhat tasks
import type { HardhatUserConfig } from "hardhat/config";

// Add this task to your hardhat.config.ts or create a separate tasks file
export function addDeployTask() {
  // This would go in your hardhat.config.ts
  return {
    "deploy-testnet": {
      description: "Deploy testnet contracts",
      action: async (args: any, hre: any) => {
        console.log("Deploying testnet contracts...");

        // In Hardhat 3.x, ethers might be available through the plugin
        const ethers = hre.ethers || (await import("ethers")).ethers;

        // Get signers
        const [deployer] = await ethers.getSigners();
        console.log("Deploying with account:", deployer.address);

        // Deploy Mock USDC
        console.log("Deploying Mock USDC...");
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const mockUSDC = await MockERC20.deploy(
          "Mock USDC",
          "mUSDC",
          6,
          ethers.parseUnits("1000000", 6)
        );
        await mockUSDC.waitForDeployment();
        console.log("Mock USDC deployed to:", await mockUSDC.getAddress());

        // Deploy Mock LP Token
        console.log("Deploying Mock LP Token...");
        const mockLPToken = await MockERC20.deploy(
          "Mock SURF/WETH LP",
          "mSURF-LP",
          18,
          ethers.parseEther("1000000")
        );
        await mockLPToken.waitForDeployment();
        console.log(
          "Mock LP Token deployed to:",
          await mockLPToken.getAddress()
        );

        // Deploy Mock NFTs
        console.log("Deploying Mock NFTs...");
        const MockNFT = await ethers.getContractFactory("MockNFT");

        const mockSurfNFT = await MockNFT.deploy("Mock SURF Board", "mSURF");
        await mockSurfNFT.waitForDeployment();
        console.log(
          "Mock SURF NFT deployed to:",
          await mockSurfNFT.getAddress()
        );

        const mockMumuNFT = await MockNFT.deploy("Mock mumu-frens", "mMUMU");
        await mockMumuNFT.waitForDeployment();
        console.log(
          "Mock Mumu NFT deployed to:",
          await mockMumuNFT.getAddress()
        );

        // Deploy LPVault
        console.log("Deploying LPVault...");
        const LPVault = await ethers.getContractFactory("LPVault");
        const lpVault = await LPVault.deploy(
          await mockLPToken.getAddress(),
          await mockUSDC.getAddress(),
          deployer.address
        );
        await lpVault.waitForDeployment();
        console.log("LPVault deployed to:", await lpVault.getAddress());

        // Deploy CCIPBridge
        console.log("Deploying CCIPBridge...");
        const CCIPBridge = await ethers.getContractFactory("CCIPBridge");
        const ccipBridge = await CCIPBridge.deploy(
          deployer.address, // initialOwner
          ethers.ZeroAddress, // Mock CCIP router
          "3478487238524512106", // Arbitrum Sepolia selector
          await mockSurfNFT.getAddress(),
          await mockMumuNFT.getAddress(),
          deployer.address
        );
        await ccipBridge.waitForDeployment();
        console.log("CCIPBridge deployed to:", await ccipBridge.getAddress());

        // Deploy HarpoonFactory
        console.log("Deploying HarpoonFactory...");
        const HarpoonFactory = await ethers.getContractFactory(
          "HarpoonFactory"
        );
        const harpoonFactory = await HarpoonFactory.deploy(
          deployer.address, // initialOwner
          ethers.ZeroAddress, // Mock CCIP router
          "16015286601757825753", // Sepolia selector
          await mockSurfNFT.getAddress(),
          await mockMumuNFT.getAddress(),
          deployer.address
        );
        await harpoonFactory.waitForDeployment();
        console.log(
          "HarpoonFactory deployed to:",
          await harpoonFactory.getAddress()
        );

        console.log("\nDeployment completed successfully!");

        // Mint some test tokens
        await mockUSDC.mint(deployer.address, ethers.parseUnits("10000", 6));
        await mockLPToken.mint(deployer.address, ethers.parseEther("1000"));
        await mockSurfNFT.mint(deployer.address, 1);
        await mockMumuNFT.mint(deployer.address, 1);

        console.log("Test tokens minted!");

        return {
          mockUSDC: await mockUSDC.getAddress(),
          mockLPToken: await mockLPToken.getAddress(),
          mockSurfNFT: await mockSurfNFT.getAddress(),
          mockMumuNFT: await mockMumuNFT.getAddress(),
          lpVault: await lpVault.getAddress(),
          ccipBridge: await ccipBridge.getAddress(),
          harpoonFactory: await harpoonFactory.getAddress(),
        };
      },
    },
  };
}
