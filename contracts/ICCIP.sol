// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


interface ICCIPRouter {
    struct EVM2AnyMessage {
        bytes receiver;
        bytes data;
        address[] tokenAddresses;
        uint256[] amounts;
        address feeToken;
        bytes extraArgs;
    }
    
    function ccipSend(
        uint64 destinationChainSelector,
        EVM2AnyMessage memory message
    ) external payable returns (bytes32 messageId);
    
    function getFee(
        uint64 destinationChainSelector,
        EVM2AnyMessage memory message
    ) external view returns (uint256 fee);
}

interface ICCIPReceiver {
    function ccipReceive(bytes calldata message) external;
}