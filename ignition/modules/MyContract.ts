import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("FullDeployment", (m) => {
  // Accounts
  const deployer = m.getAccount(0);

  // === LPVault ===
  // constructor(address _surfLPToken, address _usdc, address _feeRecipient)
  const lpVault = m.contract("LPVault", [
    "0xSurfLPTokenAddress", // replace with actual token
    "0xUSDCAddress", // replace with actual USDC
    deployer, // fee recipient
  ]);

  // === ILPVault ===
  // (check ILPVault.sol for exact constructor params)
  const ilpVault = m.contract("ILPVault", [
    lpVault, // if it links to LPVault
  ]);

  // === Harpoon ===
  // constructor(address _vault, address _owner, uint256 _param1, uint256 _param2)
  const harpoon = m.contract("Harpoon", [
    lpVault,
    deployer,
    1000, // example param
    2000, // example param
  ]);

  // === HarpoonFactory ===
  // constructor(address _vault)
  const harpoonFactory = m.contract("HarpoonFactory", [lpVault]);

  // === CCIPBridgeContract ===
  // constructor(address router, uint64 destinationChainSelector, address surfBoardNFT, address mumuFrensNFT, address admin)
  const ccipBridge = m.contract("CCIPBridgeContract", [
    "0xRouterAddress", // CCIP router
    "4949039107694359620", // example Arbitrum selector
    "0xSurfBoardNFTAddress", // NFT contract
    "0xMumuFrensNFTAddress", // NFT contract
    deployer,
  ]);

  // === DeploymentManager ===
  // constructor() { ... }
  const deploymentManager = m.contract("DeploymentManager");

  return {
    lpVault,
    ilpVault,
    harpoon,
    harpoonFactory,
    ccipBridge,
    deploymentManager,
  };
});
