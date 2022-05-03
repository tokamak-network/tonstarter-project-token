const IUniswapV3PoolABI = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");

const {
  deployedUniswapV3Contracts,
  FeeAmount,
  TICK_SPACINGS,
  getMinTick,
  getMaxTick,
  getNegativeOneTick,
  getPositiveOneMaxTick,
  encodePriceSqrt,
  getUniswapV3Pool,
  getBlock,
  mintPosition2,
  getTick,
} = require("./uniswap-v3-contracts")

const {
  POOL_BYTECODE_HASH,
  computePoolAddress,
} = require("./computePoolAddress.js");

module.exports = class UniswapEnv {
  deployedUniswap;
  owner;
  poolContract;

  constructor(owner) {
    this.owner = owner;
  }

  getAlignedPair(_token0, _token1) {
    let token0 = _token0;
    let token1 = _token1;
    if (token0 > token1) {
      token0 = _token1;
      token1 = _token0;
    }

    return [token0, token1];
  }

  async deploy() {
    this.deployedUniswap = await deployedUniswapV3Contracts(this.owner.address);
  }

  async createPool(_token0, _token1) {
    const expectedAddress = computePoolAddress(
      this.deployedUniswap.coreFactory.address,
      [_token0, _token1],
      FeeAmount.MEDIUM
    );

    let code = await this.owner.provider.getCode(expectedAddress);
    if (code.length > 0) {
      this.poolContract = new ethers.Contract(
        expectedAddress,
        IUniswapV3PoolABI.abi,
        this.owner
      );

      return expectedAddress;
    }

    const [token0, token1] = getAlignedPair(_token0, _token1);

    await this.deployedUniswap.coreFactory
      .createPool(token0, token1, FeeAmount.MEDIUM);
    await timeout(10);

    const pool = new ethers.Contract(
      expectedAddress,
      IUniswapV3PoolABI.abi,
      sender
    );

    expect(expectedAddress).to.eq(pool.address);

    await pool.connect(sender).initialize(sqrtPrice);

    await timeout(10);
    code = await sender.provider.getCode(expectedAddress);
    expect(code).to.not.eq("0x");

    this.poolContract = new ethers.Contract(
      expectedAddress,
      IUniswapV3PoolABI.abi,
      this.owner
    );
  }

  async createAndInitializePoolIfNecessary(_token0, _token1) {
    const [token0, token1] = this.getAlignedPair(_token0, _token1);
      await this.deployedUniswap.nftPositionManager
        .connect(this.owner)
        .createAndInitializePoolIfNecessary(
          token0,
          token1,
          FeeAmount.MEDIUM,
          encodePriceSqrt(1, 1)
        );
  }

  async addPool(_token0, _token1) {
    const amount0Desired = ethers.utils.parseUnits("100000", 18)
    const amount1Desired = ethers.utils.parseUnits("100000", 18)

    const [token0, token1] = this.getAlignedPair(_token0, _token1);
    await this.deployedUniswap.nftPositionManager
      .mint({
        token0: token0,
        token1: token1,
        tickLower: getNegativeOneTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
        tickUpper: getPositiveOneMaxTick(TICK_SPACINGS[FeeAmount.MEDIUM]),
        fee: FeeAmount.MEDIUM,
        recipient: this.owner.address,
        amount0Desired: amount0Desired,
        amount1Desired: amount1Desired,
        amount0Min: 0,
        amount1Min: 0,
        deadline: 100000000000000,
      });
  }

  async swap(_tokenIn, _tokenOut, _amountIn) {
    const params = {
      tokenIn: _tokenIn,
      tokenOut: _tokenOut,
      fee: FeeAmount.MEDIUM,
      recipient: this.owner.address,
      deadline: 100000000000000,
      amountIn: _amountIn,
      amountOutMinimum: ethers.BigNumber.from("0"),
      sqrtPriceLimitX96: ethers.BigNumber.from("0"),
    };

    await this.deployedUniswap.swapRouter
      .exactInputSingle(params)
  }

}
