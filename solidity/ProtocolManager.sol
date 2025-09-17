// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LPVault.sol";
import "./HarpoonFactory.sol";
import "./Harpoon.sol";
import "./CCIPBridgeContract.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ProtocolManager
 * @notice Helper contract for protocol operations and monitoring
 */
contract ProtocolManager {
    
    // Protocol contracts
    LPVault public lpVault;
    CCIPBridge public ccipBridge;
    HarpoonFactory public harpoonFactory;
    
    // Statistics
    struct ProtocolStats {
        uint256 totalLPStaked;
        uint256 totalUSDCDistributed;
        uint256 totalHarpoons;
        uint256 activeHarpoons;
        uint256 totalPnL;
        uint256 successfulHarpoons;
    }
    
    // Events
    event StatsUpdated(ProtocolStats stats);
    event RewardDistributed(uint256 amount, string source);
    
    constructor(
        address _lpVault,
        address _ccipBridge,
        address _harpoonFactory
    ) {
        lpVault = LPVault(_lpVault);
        ccipBridge = CCIPBridge(_ccipBridge);
        harpoonFactory = HarpoonFactory(_harpoonFactory);
    }
    
    /**
     * @notice Get current protocol statistics
     */
    function getProtocolStats() external view returns (ProtocolStats memory stats) {
        stats.totalLPStaked = lpVault.lpBalance();
        stats.totalUSDCDistributed = lpVault.totalRewardsDistributed();
        stats.totalHarpoons = harpoonFactory.harpoonCount();
        
        // Calculate active harpoons and P&L (simplified)
        for (uint256 i = 0; i < stats.totalHarpoons; i++) {
            address harpoonAddress = harpoonFactory.getHarpoon(i);
            Harpoon harpoon = Harpoon(harpoonAddress);
            
            if (harpoon.status() == Harpoon.Status.Open) {
                stats.activeHarpoons++;
            } else if (harpoon.status() == Harpoon.Status.Closed) {
                stats.successfulHarpoons++;
                (, , , , , int256 pnl) = harpoon.getPositionDetails();
                stats.totalPnL += uint256(pnl > 0 ? pnl : 0);
            }
        }
        
        return stats;
    }
    
    /**
     * @notice Distribute Harpoon profits to LP stakers
     * @param profitAmount Amount of profit to distribute
     */
    function distributeProfits(uint256 profitAmount) external {
        require(profitAmount > 0, "No profits to distribute");
        
        // Transfer USDC to LP Vault and notify
        IERC20 usdc = lpVault.usdc();
        usdc.transferFrom(msg.sender, address(lpVault), profitAmount);
        lpVault.notifyRewardAmount(profitAmount);
        
        emit RewardDistributed(profitAmount, "Harpoon profits");
    }
}