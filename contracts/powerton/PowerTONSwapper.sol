// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;
pragma experimental ABIEncoderV2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { iPowerTON } from "./iPowerTON.sol";
import "./IPowerTONSwapperEvent.sol";

import "../interfaces/IIERC20.sol";

import "./SeigManagerI.sol";
import "./Layer2RegistryI.sol";
import "./AutoRefactorCoinageI.sol";

import "../common/AccessibleCommon.sol";
import "./PowerTONSwapperStorage.sol";
//import "hardhat/console.sol";

contract PowerTONSwapper is
    PowerTONSwapperStorage,
    AccessibleCommon,
    iPowerTON,
    IPowerTONSwapperEvent
{
    modifier onlySeigManagerOrOwner() {
        require(
            isAdmin(msg.sender) ||
            msg.sender == seigManager,
            "PowerTONSwapper: sender is not seigManager or not admin");
        _;
    }

    constructor()
    {
    }

    function setInfo(
        address _wton,
        address _tos,
        address _uniswapRouter,
        address _erc20Recorder,
        address _layer2Registry,
        address _seigManager
        )
        external onlyOwner
    {
        wton = _wton;
        tos = ITOS(_tos);
        uniswapRouter = ISwapRouter(_uniswapRouter);
        erc20Recorder = _erc20Recorder;
        layer2Registry = _layer2Registry;
        seigManager = _seigManager;
    }

    function approveToUniswap() external {
        IERC20(wton).approve(
            address(uniswapRouter),
            type(uint256).max
        );
    }

    function swap(
        uint24 _fee,
        uint256 _deadline,
        uint256 _amountOutMinimum,
        uint160 _sqrtPriceLimitX96
    )
        external
    {
        uint256 wtonBalance = getWTONBalance();

        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: wton,
                tokenOut: address(tos),
                fee: _fee,
                recipient: address(this),
                deadline: block.timestamp + _deadline,
                amountIn: wtonBalance,
                amountOutMinimum: _amountOutMinimum,
                sqrtPriceLimitX96: _sqrtPriceLimitX96
            });
        ISwapRouter(uniswapRouter).exactInputSingle(params);

        uint256 burnAmount = tos.balanceOf(address(this));
        tos.burn(address(this), burnAmount);

        emit Swapped(burnAmount);
    }

    function getWTONBalance() public view returns(uint256) {
        return IERC20(wton).balanceOf(address(this));
    }

    // PowerTON functions
    function currentRound() external override pure returns (uint256) {
        return 0;
    }

    function roundDuration() external override pure returns (uint256) {
        return 0;
    }

    function totalDeposits() external override pure returns (uint256) {
        return 0;
    }

    function winnerOf(uint256 round) external override pure returns (address) {
        return address(0);
    }

    function powerOf(address account) external override pure returns (uint256) {
        return 0;
    }

    function init() external override {
    }

    function start() external override {
    }

    function endRound() external override {
    }

    function onDeposit(address layer2, address account, uint256 amount)
        external override onlySeigManagerOrOwner
    {
        (uint256 amountToMint, uint256 amountToBurn) = isChangeAmountInRecoder(account);

        onChangeAmountInRecoder(account, amountToMint, amountToBurn);
        emit OnDeposit(layer2, account, amount, amountToMint);
    }

    function onWithdraw(address layer2, address account, uint256 amount)
        external override onlySeigManagerOrOwner
    {
        (uint256 amountToMint, uint256 amountToBurn) = isChangeAmountInRecoder(account);

        onChangeAmountInRecoder(account, amountToMint, amountToBurn);
        emit OnWithdraw(layer2, account, amount, amountToBurn);
    }

    function onChangeAmountInRecoder(address account, uint256 amountToMint, uint256 amountToBurn)
        internal
    {
        if(amountToMint > 0) {
            IIERC20(erc20Recorder).mint(account, amountToMint);

        }else if(amountToBurn > 0){
             IIERC20(erc20Recorder).burnFrom(account, amountToBurn);
        }
    }

    // 사용자가 토카막에 스테이킹한 금액
    function userTONStakedAmountInTokamak(address account)
        public view
        returns (uint256 userTotalBalanceRay, uint256 userTotalBalanceWei)
    {
        uint256 num = Layer2RegistryI(layer2Registry).numLayer2s();
        userTotalBalanceRay = 0;
        for (uint256 i = 0; i < num; ++i) {
            address layer2Address = Layer2RegistryI(layer2Registry).layer2ByIndex(i);
            userTotalBalanceRay += SeigManagerI(seigManager).stakeOf(
                layer2Address,
                account
            );
        }

        userTotalBalanceWei = 0;
        if(userTotalBalanceRay > 0) userTotalBalanceWei = userTotalBalanceRay / 1e9;
    }

    // 사용자가 토카막에서 스테이킹양이 증가될때, 레코더에서 증가시킬양
    function isChangeAmountInRecoder(address account)
        public
        returns (uint256 amountToMint, uint256 amountToBurn)
    {
        // 추가된 금액에 상관없이, 현재 토카막에 스테이킹된 비율과 레코더의 비율을 같게하자.
        address totAddress = SeigManagerI(seigManager).tot();
        uint256 totTotalSupplyRay = AutoRefactorCoinageI(totAddress).totalSupply();
        uint256 totTotalSupplyWei = totTotalSupplyRay / 1e9;
        (, uint256 userTotalBalanceWei) = userTONStakedAmountInTokamak(account);

        uint256 recoderTotalSupply = IIERC20(erc20Recorder).totalSupply();
        uint256 recoderUserBalance = IIERC20(erc20Recorder).balanceOf(account);

        amountToMint = 0;
        amountToBurn = 0;

        uint256 cal1 = userTotalBalanceWei * recoderTotalSupply;
        uint256 cal2 = recoderUserBalance * totTotalSupplyWei;

        if(totTotalSupplyWei > userTotalBalanceWei && (cal1 > cal2))
            amountToMint = (cal1 - cal2) / (totTotalSupplyWei - userTotalBalanceWei);
        else if(totTotalSupplyWei > userTotalBalanceWei && (cal2 > cal1))
            amountToBurn = (cal2 - cal1) / (totTotalSupplyWei - userTotalBalanceWei);

    }

}
