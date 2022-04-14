const {
    keccak256,
  } = require("web3-utils");


task("deploy-erc20-recorder", "")
    // .addParam("ownerAddress", "")
    .addParam("depositManagerAddress", "Deposit Manager")
    .setAction(async function ({ ownerAddress, depositManagerAddress }) {
        const [admin] = await ethers.getSigners();

        const tokenRecorderContract = await ethers.getContractFactory("ERC20Recorder");
        tokenRecorder = await tokenRecorderContract.connect(admin).deploy(
            "Recorder",
            "RCR",
            admin.address,
            depositManagerAddress
        );
        await tokenRecorder.deployed();

        console.log("ERC20 Recorder Deployed:", tokenRecorder.address);
        await run("verify", {
            address: tokenRecorder.address,
            constructorArgsParams: ["Recorder", "RCR", admin.address, depositManagerAddress],
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

      console.log("Token Dividend Pool Implementation Deployed:", dividendPoolImpl.address);
      await run("verify", {
        address: dividendPoolImpl.address,
        constructorArgsParams: [],
     });

     console.log("Token Dividend Pool Proxy Deployed:", dividendPoolProxy.address);
     await run("verify", {
      address: dividendPoolProxy.address,
      constructorArgsParams: [dividendPoolImpl.address, admin.address],
     });
    });

task("deploy-power-ton-swapper", "")
    .addParam("wtonAddress")
    .addParam("tosAddress")
    .addParam("uniswapRouterAddress")
    .addParam("erc20RecorderAddress")
    .addParam("layer2RegistryAddress")
    .addParam("seigManagerAddress")
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

        console.log("PowerTONSwapper Deployed:", powerTON.address);

        await run("verify", {
          address: powerTON.address,
          constructorArgsParams: [wtonAddress, tosAddress, uniswapRouterAddress, erc20RecorderAddress, layer2RegistryAddress, seigManagerAddress],
         });

    });


task("set-erc20-recorder", "")
    .addParam("erc20RecorderAddress", "")
    .addParam("powerTon", "")
    .addParam("tokenDividendPoolAddress", "")
    .setAction(async ({  erc20RecorderAddress, powerTon, tokenDividendPoolAddress }) => {

        const [admin] = await ethers.getSigners()
        const erc20Recorder = await ethers.getContractAt("ERC20Recorder", erc20RecorderAddress) ;

        let SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
        let MINTER_ROLE = keccak256("MINTER_ROLE");
        let BURNER_ROLE = keccak256("BURNER_ROLE");


        let tx = await erc20Recorder.connect(admin).grantRole(MINTER_ROLE, powerTon);
        let tx1 = await erc20Recorder.connect(admin).grantRole(BURNER_ROLE, powerTon);
        let tx2 = await erc20Recorder.connect(admin).grantRole(SNAPSHOT_ROLE, tokenDividendPoolAddress);


        console.log('grantRole MINTER_ROLE ', tx.hash);
        console.log('grantRole BURNER_ROLE ', tx1.hash);
        console.log('grantRole SNAPSHOT_ROLE ', tx2.hash);

    });
