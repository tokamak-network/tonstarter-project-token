task("deploy-erc20-recorder", "")
    .addParam("ownerAddress", "")
    .addParam("depositManagerAddress", "Deposit Manager")
    .setAction(async function ({ ownerAddress, depositManagerAddress }) {
        const [admin] = await ethers.getSigners();

        const tokenRecorderContract = await ethers.getContractFactory("ERC20Recorder");
        tokenRecorder = await tokenRecorderContract.connect(admin).deploy(
            "Recorder",
            "RCR",
            ownerAddress,
            depositManagerAddress
        );
        await tokenRecorder.deployed();

        await run("verify", {
            address: tokenRecorder.address,
            constructorArgsParams: ["Recorder", "RCR", ownerAddress, depositManagerAddress],
        });
    });

task("deploy-token-dividend-pool","")
    .addParam("erc20RecorderAddress", "ERC20 Recorder")
    .setAction(async function({ erc20RecorderAddress }) {
      const [admin] = await ethers.getSigners();

      const TokenDividendPoolImplContract = await ethers.getContractFactory("TokenDividendPool");
      const dividendPoolImpl = await TokenDividendPoolImplContract.connect(admin).deploy();
      await dividendPoolImpl.deployed();

      const TokenDividendPoolProxyContract = await ethers.getContractFactory("TokenDividendPoolProxy");
      const dividendPoolProxy = await TokenDividendPoolProxyContract.connect(admin).deploy(dividendPoolImpl.address, admin.address);
      await dividendPoolProxy.deployed();
      await (await dividendPoolProxy.connect(admin).initialize(erc20RecorderAddress)).wait();

      // dividendPool = await ethers.getContractAt("TokenDividendPool", dividendPoolProxy.address);

      await run("verify", {
        address: dividendPoolImpl.address,
        constructorArgsParams: [],
     });

     await run("verify", {
      address: dividendPoolProxy.address,
      constructorArgsParams: [dividendPoolImpl.address, admin.address],
     });
    });

task("deploy-power-ton-swapper", "")
    .setAction(async function ({
      wtonAddress,
      tosAddress,
      uniswapRouterAddress,
      erc20RecorderAddress,
      layer2RegistryAddress,
      seigManagerAddress,
    }) {
        const [admin] = await ethers.getSigners()
        const powerTON = await (await ethers.getContractFactory("PowerTONSwapper"))
            .connect(admin)
            .deploy(wtonAddress, tosAddress, uniswapRouterAddress, erc20RecorderAddress, layer2RegistryAddress, seigManagerAddress);
        await powerTON.deployed();
        // await (await powerTON.connect(admin).init()).wait();
        await run("verify", {
          address: powerTON.address,
          constructorArgsParams: [wtonAddress, tosAddress, uniswapRouterAddress, erc20RecorderAddress, layer2RegistryAddress, seigManagerAddress],
         });
    });

