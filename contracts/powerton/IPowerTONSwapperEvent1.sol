// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

interface IPowerTONSwapperEvent1
{
    event OnDeposit(address layer2, address indexed account, uint256 amount);
    event OnWithdraw(address layer2, address indexed account, uint256 amount);

    event Swapped(uint256 wtonAmount, uint256 tosAmount);
    event Burned(uint256 tosAmount);
}
