// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;
pragma experimental ABIEncoderV2;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { iPowerTON } from "./iPowerTON.sol";
import "./IPowerTONSwapperEvent1.sol";

import "../libraries/FixedPoint96.sol";
import "../libraries/FullMath.sol";

import "../libraries/TickMath.sol";
import "../libraries/OracleLibrary.sol";


import "../interfaces/IIERC20.sol";
import "../interfaces/IAutoCoinageSnapshot.sol";

import "./SeigManagerI.sol";
import "./Layer2RegistryI.sol";
import "./AutoRefactorCoinageI.sol";

import "../common/AccessibleCommon.sol";
import "./PowerTONSwapperStorage.sol";
import "./PowerTONSwapperStorage1.sol";


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

    function setSlippageLimit(uint8 slippage) external onlyOwner
    {
        require(slippage > 0, "zero slippage");
        require(SLIPPAGE_LIMIT != slippage, "same slippage");
        SLIPPAGE_LIMIT = slippage;
    }

    function setAcceptTickInterval(uint8 tickInterval) external onlyOwner
    {
        require(tickInterval > 0, "zero slippage");
        require(ACCEPT_TICK_INTERVAL != tickInterval, "same slippage");
        ACCEPT_TICK_INTERVAL = tickInterval;
    }

    function approveToUniswap() external {
        IERC20(wton).approve(
            address(uniswapRouter),
            type(uint256).max
        );
    }

    function swap(
        uint256 _amountIn,
        uint256 _amountOutMinimum,
        uint160 _sqrtPriceLimitX96,
        uint8 slippage,
        int24 curTick
    )
        external
    {
        require(_amountIn <= getWTONBalance(), "wton is insufficient");

        //--
        if (fee == 0) fee = 3000;
        if (SLIPPAGE_LIMIT == 0) SLIPPAGE_LIMIT = 100;
        if (ACCEPT_TICK_INTERVAL == 0) ACCEPT_TICK_INTERVAL = 4;

        require(slippage > 0 && slippage <= SLIPPAGE_LIMIT, "It is not allowed slippage.");
        address poolAddress = getPoolAddress();
        require(poolAddress != address(0), "pool didn't exist");
        IIUniswapV3Pool pool = IIUniswapV3Pool(poolAddress);

        (uint160 sqrtPriceX96, int24 tick,,,,,) =  pool.slot0();
        require(sqrtPriceX96 > 0, "pool is not initialized");

        /*
        require(
            acceptMinTick(tick, getTickSpacing(fee)) <= curTick
            && curTick < acceptMaxTick(tick, getTickSpacing(fee)),
            "It's not allowed changed tick range."
        );
        */

        int24 timeWeightedAverageTick = OracleLibrary.consult(poolAddress, 60);
        require(
            acceptMinTick(timeWeightedAverageTick, getTickSpacing(fee)) <= curTick
            && curTick < acceptMaxTick(timeWeightedAverageTick, getTickSpacing(fee)),
            "It's not allowed changed tick range."
        );


        uint256 price = getPriceX96FromSqrtPriceX96(sqrtPriceX96);

        // ---
        ISwapRouter.ExactInputSingleParams memory params =
            ISwapRouter.ExactInputSingleParams({
                tokenIn: wton,
                tokenOut: address(tos),
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp + 1000,
                amountIn: _amountIn,
                amountOutMinimum: _amountOutMinimum,
                sqrtPriceLimitX96: _sqrtPriceLimitX96
            });

        uint256 amountOut = ISwapRouter(uniswapRouter).exactInputSingle(params);
        emit Swapped(_amountIn, amountOut);

        //--
        (uint160 sqrtPriceX961,,,,,,) =  pool.slot0();
        uint256 price1 = getPriceX96FromSqrtPriceX96(sqrtPriceX961);

        uint256 lower = price * ( 1000 - (uint256(slippage) * 1000 / 200) ) / 1000 ;
        uint256 upper = price * ( 1000 + (uint256(slippage) * 1000 / 200) ) / 1000 ;

        require(lower <= price1 && price1 < upper, "out of acceptable price range");

        //--
        uint256 burnAmount = tos.balanceOf(address(this));
        tos.burn(address(this), burnAmount);
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
        int24 _acceptMinTick = _tick - (_tickSpacings * int24(uint24(ACCEPT_TICK_INTERVAL)));

        if(_minTick < _acceptMinTick) return _acceptMinTick;
        else return _minTick;
    }

    function acceptMaxTick(int24 _tick, int24 _tickSpacings) public returns (int24)
    {
        int24 _maxTick = getMaxTick(_tickSpacings);
        int24 _acceptMinTick = _tick + (_tickSpacings * int24(uint24(ACCEPT_TICK_INTERVAL)));

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
