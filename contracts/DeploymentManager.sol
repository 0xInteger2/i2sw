// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DeploymentManager
 * @notice Lightweight deployment coordinator for the LP Incentive Protocol
 * @dev This contract is kept minimal to avoid size issues
 * @dev For actual deployment, use the deployment scripts instead
 */
contract DeploymentManager {
    
    // Events for tracking deployments
    event ContractsDeployed(
        address lpVault,
        address ccipBridge,
        address harpoonFactory
    );
    
    event CrossChainConfigured(
        address ethereumBridge,
        address arbitrumFactory
    );

    // Store deployment addresses for reference
    struct DeploymentRecord {
        address lpVault;
        address ccipBridge;
        address harpoonFactory;
        uint256 timestamp;
        address deployer;
    }
    
    mapping(uint256 => DeploymentRecord) public deployments;
    uint256 public deploymentCount;

    /**
     * @notice Record a deployment (can be called by deployment scripts)
     */
    function recordDeployment(
        address _lpVault,
        address _ccipBridge,
        address _harpoonFactory
    ) external {
        deploymentCount++;
        deployments[deploymentCount] = DeploymentRecord({
            lpVault: _lpVault,
            ccipBridge: _ccipBridge,
            harpoonFactory: _harpoonFactory,
            timestamp: block.timestamp,
            deployer: msg.sender
        });
        
        emit ContractsDeployed(_lpVault, _ccipBridge, _harpoonFactory);
    }
    
    /**
     * @notice Record cross-chain configuration
     */
    function recordCrossChainConfig(
        address _ethereumBridge,
        address _arbitrumFactory
    ) external {
        emit CrossChainConfigured(_ethereumBridge, _arbitrumFactory);
    }
    
    /**
     * @notice Get deployment record
     */
    function getDeployment(uint256 _id) external view returns (
        address lpVault,
        address ccipBridge,
        address harpoonFactory,
        uint256 timestamp,
        address deployer
    ) {
        DeploymentRecord memory record = deployments[_id];
        return (
            record.lpVault,
            record.ccipBridge,
            record.harpoonFactory,
            record.timestamp,
            record.deployer
        );
    }
}