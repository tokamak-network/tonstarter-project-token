// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import { ITOS } from "./ITOS.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract PowerTONSwapperStorage {
    /// @dev flag for pause proxy
    bool public pauseProxy;

    address public wton;
    ITOS public tos;
    ISwapRouter public uniswapRouter;
    address public erc20Recorder;
    address public layer2Registry;
    address public seigManager;

    bool public migratedL2;
}
