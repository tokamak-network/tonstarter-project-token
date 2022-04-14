// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

interface IPowerTONSwapperEvent
{
    event OnDeposit(address layer2, address indexed account, uint256 amount, uint256 amountToMint);
    event OnWithdraw(address layer2, address indexed account, uint256 amount, uint256 amountToMint);

    event Swapped(
        uint256 amount
    );

}
