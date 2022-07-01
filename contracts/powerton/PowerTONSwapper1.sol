// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;
pragma experimental ABIEncoderV2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { iPowerTON } from "./iPowerTON.sol";
import "./IPowerTONSwapperEvent1.sol";

import "../libraries/FixedPoint128.sol";
import "../libraries/FixedPoint96.sol";
import "../libraries/FullMath.sol";

import "../libraries/TickMath.sol";
import "../libraries/OracleLibrary.sol";
import "../libraries/Tick.sol";
import '../libraries/LiquidityAmounts.sol';

import "../interfaces/IIERC20.sol";
import "../interfaces/IAutoCoinageSnapshot.sol";

import "./SeigManagerI.sol";
import "./Layer2RegistryI.sol";
import "./AutoRefactorCoinageI.sol";

import "../common/AccessibleCommon.sol";
import "./PowerTONSwapperStorage.sol";
import "./PowerTONSwapperStorage1.sol";

import "hardhat/console.sol";

interface I2ERC20 {
    function decimals() external view returns (uint256);
}

interface IIUniswapV3Factory {

    function getPool(address,address,uint24) external view returns (address);
}

interface IIUniswapV3Pool {

    function token0() external view returns (address);
    function token1() external view returns (address);

    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint8 feeProtocol,
            bool unlocked
        );
    function tickBitmap(int16) external view returns (uint256);
    function ticks(int24) external view returns (Tick.Info memory);
}

contract PowerTONSwapper1 is
    PowerTONSwapperStorage,
    AccessibleCommon,
    iPowerTON,
    IPowerTONSwapperEvent1,
    PowerTONSwapperStorage1
{
    modifier onlySeigManagerOrOwner() {
        require(
            isAdmin(msg.sender) ||
            msg.sender == seigManager,
            "PowerTONSwapper: sender is not seigManager or not admin");
        _;
    }

    event OnChangeAmountInRecoder(address indexed account, uint256 amountToMint, uint256 amountToBurn);

    constructor()
    {
    }

    function setInfo(
        address _wton,
        address _tos,
        address _uniswapRouter,
        address _autocoinageSnapshot,
        address _layer2Registry,
        address _seigManager
        )
        external onlyOwner
    {
        wton = _wton;
        tos = ITOS(_tos);
        uniswapRouter = ISwapRouter(_uniswapRouter);
        autocoinageSnapshot = _autocoinageSnapshot;
        layer2Registry = _layer2Registry;
        seigManager = _seigManager;
    }

    function setAutocoinageSnapshot(
        address _autocoinageSnapshot
        )
        external onlyOwner
    {
        autocoinageSnapshot = _autocoinageSnapshot;
    }

    function setAcceptTickChangeInterval(int24 _interval) external onlyOwner
    {
        require(_interval > 0, "zero");
        require(acceptTickChangeInterval != _interval, "same");
        acceptTickChangeInterval = _interval;
    }

    function setMinimumTickInterval(int24 _interval) external onlyOwner
    {
        require(_interval > 0, "zero");
        require(minimumTickInterval != _interval, "same");
        minimumTickInterval = _interval;
    }


    function approveToUniswap() public {
        IERC20(wton).approve(
            address(uniswapRouter),
            type(uint256).max
        );
    }


    function getQuoteAtTick(
        int24 tick,
        uint128 amountIn,
        address baseToken,
        address quoteToken
    ) public view returns (uint256 amountOut) {
        return OracleLibrary.getQuoteAtTick(tick, amountIn, baseToken, quoteToken);
    }


    function limitPrameters(
        uint256 amountIn,
        address _pool,
        address token0,
        address token1,
        int24 acceptTickCounts
    ) public view returns  (uint256 amountOutMinimum, uint256 priceLimit, uint160 sqrtPriceX96Limit)
    {
        IIUniswapV3Pool pool = IIUniswapV3Pool(_pool);
        //require(address(pool) != address(0), "pool didn't exist");

        (uint160 sqrtPriceX96, int24 tick,,,,,) =  pool.slot0();
        //require(sqrtPriceX96 > 0, "pool is not initialized");

        int24 _tick = tick;
        if(token0 < token1) {
            _tick = tick - acceptTickCounts * 60;
            if(_tick < TickMath.MIN_TICK ) _tick =  TickMath.MIN_TICK ;
        } else {
            _tick = tick + acceptTickCounts * 60;
            if(_tick > TickMath.MAX_TICK ) _tick =  TickMath.MAX_TICK ;
        }
        address token1_ = token1;
        address token0_ = token0;
        return (
              getQuoteAtTick(
                _tick,
                uint128(amountIn),
                token0_,
                token1_
                ),
             getQuoteAtTick(
                _tick,
                uint128(10**27),
                token0_,
                token1_
             ),
             TickMath.getSqrtRatioAtTick(_tick)
        );
    }

    function swap(
        uint256 _amountIn
    )
        external
    {
        require(_amountIn <= getWTONBalance(), "wton is insufficient");

        if (IERC20(wton).allowance(address(this), address(uniswapRouter)) < _amountIn) {
            approveToUniswap();
        }

        if (acceptTickChangeInterval == 0) acceptTickChangeInterval = 8;
        if (minimumTickInterval == 0) minimumTickInterval = 18;

        address poolAddress = getPoolAddress();
        require(poolAddress != address(0), "pool didn't exist");
        IIUniswapV3Pool pool = IIUniswapV3Pool(poolAddress);

        (uint160 sqrtPriceX96, int24 tick,,,,,) =  pool.slot0();
        require(sqrtPriceX96 > 0, "pool is not initialized");

        int24 timeWeightedAverageTick = OracleLibrary.consult(poolAddress, 120);
        require(
            acceptMinTick(timeWeightedAverageTick, 60) <= tick
            && tick < acceptMaxTick(timeWeightedAverageTick, 60),
            "It's not allowed changed tick range."
        );

        (uint256 amountOutMinimum, uint256 priceLimit, uint160 sqrtPriceX96Limit)
            = limitPrameters(_amountIn, poolAddress, wton, address(tos), minimumTickInterval);


        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: wton,
                tokenOut: address(tos),
                fee: 3000,
                recipient: address(this),
                deadline: block.timestamp + 20,
                amountIn: _amountIn,
                amountOutMinimum: amountOutMinimum,
                sqrtPriceLimitX96: sqrtPriceX96Limit
            });

        uint256 amountOut = ISwapRouter(uniswapRouter).exactInputSingle(params);
        emit Swapped(_amountIn, amountOut);
        console.log("_amountIn %s", _amountIn);
        console.log("amountOut %s", amountOut);

        uint256 burnAmount = tos.balanceOf(address(this));
        tos.burn(address(this), burnAmount);
        console.log("burnAmount %s", burnAmount);


        emit Burned(burnAmount);
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
        IAutoCoinageSnapshot(autocoinageSnapshot).addSync(layer2, account);
        //emit OnDeposit(layer2, account, amount);
    }

    function onWithdraw(address layer2, address account, uint256 amount)
        external override onlySeigManagerOrOwner
    {
        IAutoCoinageSnapshot(autocoinageSnapshot).addSync(layer2, account);
        //emit OnWithdraw(layer2, account, amount);
    }

    function getPoolAddress() public view returns(address) {
        address factory = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
        return IIUniswapV3Factory(factory).getPool(wton, address(tos), 3000);
    }

    function getDecimals(address token0, address token1) public view returns(uint256 token0Decimals, uint256 token1Decimals) {
        return (I2ERC20(token0).decimals(), I2ERC20(token1).decimals());
    }

    function getPriceX96FromSqrtPriceX96(uint160 sqrtPriceX96) public pure returns(uint256 priceX96) {
        return FullMath.mulDiv(sqrtPriceX96, sqrtPriceX96, FixedPoint96.Q96);
    }

    function currentTick() public view returns(uint160 sqrtPriceX96, int24 tick) {

        address getPool = getPoolAddress();
        if(getPool != address(0)) {
            (uint160 sqrtPriceX96, int24 tick,,,,,) =  IIUniswapV3Pool(getPool).slot0();
            return (sqrtPriceX96, tick);
        }
        return (0, 0);
    }

    function getTickSpacing(uint24 _fee) public returns (int24 tickSpacings)
    {
        if(_fee == 500) tickSpacings = 10;
        else if(_fee == 3000) tickSpacings = 60;
        else if(_fee == 10000) tickSpacings = 200;
    }

    function acceptMinTick(int24 _tick, int24 _tickSpacings) public returns (int24)
    {

        int24 _minTick = getMiniTick(_tickSpacings);
        int24 _acceptMinTick = _tick - (_tickSpacings * int24(uint24(acceptTickChangeInterval)));

        if(_minTick < _acceptMinTick) return _acceptMinTick;
        else return _minTick;
    }

    function acceptMaxTick(int24 _tick, int24 _tickSpacings) public returns (int24)
    {
        int24 _maxTick = getMaxTick(_tickSpacings);
        int24 _acceptMinTick = _tick + (_tickSpacings * int24(uint24(acceptTickChangeInterval)));

        if(_maxTick < _acceptMinTick) return _maxTick;
        else return _acceptMinTick;
    }

    function getMiniTick(int24 tickSpacings) public view returns (int24){
           return (TickMath.MIN_TICK / tickSpacings) * tickSpacings ;
    }

    function getMaxTick(int24 tickSpacings) public view  returns (int24){
           return (TickMath.MAX_TICK / tickSpacings) * tickSpacings ;
    }


}
