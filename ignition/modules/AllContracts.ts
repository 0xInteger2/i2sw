import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const AllContractsModule = buildModule("AllContractsModule", (m) => {
  const ccipBridge = m.contract("CCIPBridge", [
    m.getParameter("ccipRouter"),
    m.getParameter("remoteChainSelector"),
    m.getParameter("surfBoardNFT"),
    m.getParameter("mumuFrensNFT"),
    m.getParameter("feeRecipient"),
  ]);

  const lpVault = m.contract("LPVault", [
    m.getParameter("lpToken"),
    m.getParameter("usdc"),
    m.getParameter("feeRecipient"),
  ]);

  const harpoonFactory = m.contract("HarpoonFactory", [
    m.getParameter("usdc"),
    m.getParameter("surfBoardNFT"),
    m.getParameter("mumuFrensNFT"),
    m.getParameter("feeRecipient"),
    m.getParameter("lpToken"),
  ]);

  const deploymentManager = m.contract("DeploymentManager"); // no args

  return { ccipBridge, lpVault, harpoonFactory, deploymentManager };
});

export default AllContractsModule;
