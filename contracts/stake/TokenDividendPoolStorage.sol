// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "../libraries/LibTokenDividendPool.sol";
import "../tokens/ERC20A.sol";

contract TokenDividendPoolStorage {
    /// @dev flag for pause proxy
    bool public pauseProxy;

    /// @dev registry
    address public stakeRegistry;
    bool public migratedL2;

    address public erc20DividendAddress;
    mapping(address => LibTokenDividendPool.Distribution) public distributions;
    address[] public distributedTokens;
    uint256 internal free = 1;
}
