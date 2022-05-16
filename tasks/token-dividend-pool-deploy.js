const fs = require('fs');

const {
    keccak256,
  } = require("web3-utils");


task("deploy-autocoinage-snapshot", "")
  .addParam("name", "Name")
  .addParam("symbol", "Symbol")
  .addParam("seigManagerAddress", "SeigManager Manager")
  .addParam("layer2RegistryAddress", "Layer2Registry Manager")
  .setAction(async function ({ name, symbol, seigManagerAddress, layer2RegistryAddress }) {
      const [admin] = await ethers.getSigners();

    // await hre.ethers.provider.send("hardhat_setBalance", [
    //   admin.address,
    //   "0x56BC75E2D63100000",
    // ]);
      const AutoCoinageSnapshot = await ethers.getContractFactory("AutoCoinageSnapshot");
      let autoCoinageSnapshot = await AutoCoinageSnapshot.connect(admin).deploy();
      await autoCoinageSnapshot.deployed();

      console.log("AutoCoinageSnapshot Deployed:", autoCoinageSnapshot.address);

      const AutoCoinageSnapshotProxy = await ethers.getContractFactory("AutoCoinageSnapshotProxy");
      const autoCoinageSnapshotProxy = await AutoCoinageSnapshotProxy.connect(admin).deploy();
      await autoCoinageSnapshotProxy.deployed();

      console.log("AutoCoinageSnapshotProxy Deployed:", autoCoinageSnapshotProxy.address);

    //   const AutoCoinageSnapshotProxyABI = JSON.parse(await fs.readFileSync("./abi/AutoCoinageSnapshotProxy.json")).abi;
    //   const AutoCoinageSnapshotABI = JSON.parse(await fs.readFileSync("./abi/AutoCoinageSnapshot.json")).abi;

    //   const autoCoinageSnapshotProxy = new ethers.Contract(
    //       "0x4D727B91A774eEC8aD91F14320853393648d313C",
    //       AutoCoinageSnapshotProxyABI,
    //       ethers.provider
    //   );

        await (await autoCoinageSnapshotProxy.connect(admin).upgradeTo(autoCoinageSnapshot.address)).wait();
        await (await autoCoinageSnapshotProxy.connect(admin).setNameSymbolDecimals(name, symbol, 27)).wait();

        const AutoCoinageSnapshotABI = JSON.parse(await fs.readFileSync("./abi/AutoCoinageSnapshot.json")).abi;
        const autoCoinageSnapshotContract = new ethers.Contract(
                    autoCoinageSnapshotProxy.address,
                    AutoCoinageSnapshotABI,
                    ethers.provider
              );
        await (await autoCoinageSnapshotContract.connect(admin).setAddress(seigManagerAddress, layer2RegistryAddress)).wait();

      await run("verify", {
        address: autoCoinageSnapshot.address,
        constructorArgsParams: [],
      });

      await run("verify", {
        address: autoCoinageSnapshotProxy.address,
        constructorArgsParams: [],
      });
  });



  task("deploy-autocoinage-snapshot2", "")
  .addParam("name", "Name")
  .addParam("symbol", "Symbol")
  .addParam("seigManagerAddress", "SeigManager Manager")
  .addParam("layer2RegistryAddress", "Layer2Registry Manager")
  .setAction(async function ({ name, symbol, seigManagerAddress, layer2RegistryAddress }) {
      const [admin] = await ethers.getSigners();
      console.log('deploy-autocoinage-snapshot2' , admin.address);

        // await hre.ethers.provider.send("hardhat_setBalance", [
        //   admin.address,
        //   "0x56BC75E2D63100000",
        // ]);

        try{
            const AutoCoinageSnapshot = await ethers.getContractFactory("AutoCoinageSnapshot2");
            let autoCoinageSnapshot = await AutoCoinageSnapshot.connect(admin).deploy();
            await autoCoinageSnapshot.deployed();

            console.log("AutoCoinageSnapshot2 Deployed:", autoCoinageSnapshot.address);

            const AutoCoinageSnapshotProxy = await ethers.getContractFactory("AutoCoinageSnapshotProxy2");
            const autoCoinageSnapshotProxy = await AutoCoinageSnapshotProxy.connect(admin).deploy();
            await autoCoinageSnapshotProxy.deployed();

            console.log("AutoCoinageSnapshotProxy2 Deployed:", autoCoinageSnapshotProxy.address);

                await (await autoCoinageSnapshotProxy.connect(admin).upgradeTo(autoCoinageSnapshot.address)).wait();
                await (await autoCoinageSnapshotProxy.connect(admin).setNameSymbolDecimals(name, symbol, 27)).wait();

                const AutoCoinageSnapshotABI = JSON.parse(await fs.readFileSync("./abi/AutoCoinageSnapshot2.json")).abi;
                const autoCoinageSnapshotContract = new ethers.Contract(
                            autoCoinageSnapshotProxy.address,
                            AutoCoinageSnapshotABI,
                            ethers.provider
                    );
                await (await autoCoinageSnapshotContract.connect(admin).setAddress(seigManagerAddress, layer2RegistryAddress)).wait();

            await run("verify", {
                address: autoCoinageSnapshot.address,
                constructorArgsParams: [],
            });

            await run("verify", {
                address: autoCoinageSnapshotProxy.address,
                constructorArgsParams: [],
            });

        } catch(error){
            console.log('error' , error);
        }
  });


task("upgrade-autocoinage-snapshot", "")
.addParam("autoCoinageAddress", "AutoCoinage Manager")
.setAction(async function ({ autoCoinageAddress }) {
    const [admin] = await ethers.getSigners();


    const AutoCoinageSnapshot = await ethers.getContractFactory("AutoCoinageSnapshot2");
    let autoCoinageSnapshot = await AutoCoinageSnapshot.connect(admin).deploy();
    await autoCoinageSnapshot.deployed();
    console.log("AutoCoinageSnapshotImp Deployed:", autoCoinageSnapshot.address);


    const AutoCoinageSnapshotProxyABI = JSON.parse(await fs.readFileSync("./abi/AutoCoinageSnapshotProxy.json")).abi;
    const AutoCoinageSnapshotABI = JSON.parse(await fs.readFileSync("./abi/AutoCoinageSnapshot2.json")).abi;

    const autoCoinageSnapshotProxy = new ethers.Contract(
        autoCoinageAddress,
        AutoCoinageSnapshotProxyABI,
        ethers.provider
    );

    await (await autoCoinageSnapshotProxy.connect(admin).upgradeTo(autoCoinageSnapshot.address)).wait();

    await run("verify", {
      address: autoCoinageSnapshot.address,
      constructorArgsParams: [],
    });

});

task("deploy-erc20-recorder", "")
    // .addParam("ownerAddress", "")
    .addParam("depositManagerAddress", "Deposit Manager")
    .setAction(async function ({ ownerAddress, depositManagerAddress }) {
        const [admin] = await ethers.getSigners();

        const tokenRecorderContract = await ethers.getContractFactory("ERC20Recorder");
        tokenRecorder = await tokenRecorderContract.connect(admin).deploy(
            "TONStakedRatio",
            "TSR",
            admin.address,
            depositManagerAddress
        );
        await tokenRecorder.deployed();

        console.log("ERC20 Recorder Deployed:", tokenRecorder.address);
        await run("verify", {
            address: tokenRecorder.address,
            constructorArgsParams: ["TONStakedRatio", "TSR", admin.address, depositManagerAddress],
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
        console.log("Token Dividend Pool Proxy Deployed:", dividendPoolProxy.address);

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
    .addParam("wtonAddress")
    .addParam("tosAddress")
    .addParam("uniswapRouterAddress")
    .addParam("autocoinageSnapshotAddress")
    .addParam("layer2RegistryAddress")
    .addParam("seigManagerAddress")
    .setAction(async function ({
      wtonAddress,
      tosAddress,
      uniswapRouterAddress,
      autocoinageSnapshotAddress,
      layer2RegistryAddress,
      seigManagerAddress,
    }) {

        const [admin] = await ethers.getSigners()

        const PowerTONSwapperImplContract = await ethers.getContractFactory("PowerTONSwapper");
        const powerTONSwapperImpl = await PowerTONSwapperImplContract.connect(admin).deploy();
        await powerTONSwapperImpl.deployed();

        console.log("powerTONSwapperImpl Deployed:", powerTONSwapperImpl.address);

        const PowerTONSwapperProxyContract = await ethers.getContractFactory("PowerTONSwapperProxy");
        const powerTONSwapperProxy = await PowerTONSwapperProxyContract.connect(admin).deploy(
            powerTONSwapperImpl.address, wtonAddress, tosAddress, uniswapRouterAddress, autocoinageSnapshotAddress, layer2RegistryAddress, seigManagerAddress);

        await powerTONSwapperProxy.deployed();

        console.log("powerTONSwapperProxy Deployed:", powerTONSwapperProxy.address);

        // ---------------
        const AutoCoinageSnapshotProxyABI = JSON.parse(await fs.readFileSync("./abi/AutoCoinageSnapshotProxy2.json")).abi;
        const autoCoinageSnapshotProxy = new ethers.Contract(
            autocoinageSnapshotAddress,
            AutoCoinageSnapshotProxyABI,
            ethers.provider
        );
        let ADMIN_ROLE = keccak256("ADMIN_ROLE");
        let tx = await autoCoinageSnapshotProxy.connect(admin).grantRole(ADMIN_ROLE, powerTONSwapperProxy.address);

        console.log('autoCoinageSnapshotProxy grantRole ADMIN_ROLE ', tx.hash);
        // ---------------

        await run("verify", {
            address: powerTONSwapperImpl.address,
            constructorArgsParams: [],
           });


        await run("verify", {
          address: powerTONSwapperProxy.address,
          constructorArgsParams: [powerTONSwapperImpl.address, wtonAddress, tosAddress, uniswapRouterAddress, autocoinageSnapshotAddress, layer2RegistryAddress, seigManagerAddress],
         });

    });


task("set-erc20-recorder", "")
    .addParam("erc20RecorderAddress", "")
    .addParam("powerTonAddress", "")
    .addParam("tokenDividendPoolAddress", "")
    .setAction(async ({  erc20RecorderAddress, powerTonAddress, tokenDividendPoolAddress }) => {

        const [admin] = await ethers.getSigners()
        const erc20Recorder = await ethers.getContractAt("ERC20Recorder", erc20RecorderAddress) ;

        let SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
        let MINTER_ROLE = keccak256("MINTER_ROLE");
        let BURNER_ROLE = keccak256("BURNER_ROLE");

        let tx = await erc20Recorder.connect(admin).grantRole(MINTER_ROLE, powerTonAddress);
        let tx1 = await erc20Recorder.connect(admin).grantRole(BURNER_ROLE, powerTonAddress);
        let tx2 = await erc20Recorder.connect(admin).grantRole(SNAPSHOT_ROLE, tokenDividendPoolAddress);


        console.log('grantRole MINTER_ROLE ', tx.hash);
        console.log('grantRole BURNER_ROLE ', tx1.hash);
        console.log('grantRole SNAPSHOT_ROLE ', tx2.hash);

    });


task("get-sum-of-layer2s", "")
    .addParam("layer2RegistryAddress", "")
    .addParam("seigManagerAddress", "")
    .setAction(async ({  layer2RegistryAddress, seigManagerAddress }) => {

        const [admin] = await ethers.getSigners()

        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );


        const layer2RegistryABI = JSON.parse(await fs.readFileSync("./abi/layer2Registry.json")).abi;
        const layer2Registry = new ethers.Contract(
            layer2RegistryAddress,
            layer2RegistryABI,
            ethers.provider
        );

        const autoRefactorCoinageABI = JSON.parse(await fs.readFileSync("./abi/autoRefactorCoinage.json")).abi;

        let num = await layer2Registry.numLayer2s();
        let total = ethers.BigNumber.from(0);

        console.log('layer2Registry num', num);
        for (let i = 0; i < num; ++i) {
            console.log('-----------------');
            let layer2Address = await layer2Registry.layer2ByIndex(i);
            console.log('layer2Address', i, layer2Address);
            let coinageAddress = await seigManager.coinages(layer2Address);
            console.log('coinageAddress', i, coinageAddress);
            const coinage = new ethers.Contract(
                coinageAddress,
                autoRefactorCoinageABI,
                ethers.provider
            );
            let coinageTotalSupply = await coinage.totalSupply();
            console.log('coinageTotalSupply', i, coinageTotalSupply);

            total = total.add(coinageTotalSupply);
        }
        console.log('-----------------');
        console.log('sum of coinageTotalSupply (ray) ', total);

        let totalStakedWei = ethers.utils.formatUnits(total, 9);
        let end = Math.min(totalStakedWei.indexOf('.'), totalStakedWei.length) ;
        console.log('sum of coinageTotalSupply (wei) ', totalStakedWei.substring(0,end));

    });


task("compare-layer2-staked-amount", "")
.addParam("layer2RegistryAddress", "")
.addParam("seigManagerAddress", "")
.setAction(async ({  layer2RegistryAddress, seigManagerAddress }) => {

    const [admin] = await ethers.getSigners()

    const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers-finish.json"));
    const stakesOfAllUsers = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers-update.json"));
    const autoRefactorCoinageABI = JSON.parse(await fs.readFileSync("./abi/autoRefactorCoinage.json")).abi;
    const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
    const seigManager = new ethers.Contract(
        seigManagerAddress,
        seigManagerABI,
        ethers.provider
    );

    for (const layer2 of layer2s) {
        console.log('-----------------------------', layer2);
        let totalStaked = ethers.BigNumber.from(0);
        for (const staker of stakers) {
            if (!stakesOfAllUsers[layer2][staker]) {
                continue;
            }
            if (stakesOfAllUsers[layer2][staker]) {
                totalStaked = totalStaked.add(ethers.BigNumber.from(stakesOfAllUsers[layer2][staker]));
            }
        }

        let coinageAddress = await seigManager.coinages(layer2);
        const coinage = new ethers.Contract(
            coinageAddress,
            autoRefactorCoinageABI,
            ethers.provider
        );
        let coinageTotalSupply = await coinage.totalSupply();
        console.log(layer2, coinageAddress, totalStaked.toString() );
        console.log(layer2, coinageAddress, coinageTotalSupply.toString() );
    }

});




task("display-owner-autocoinage-powerton-dividendpool", "Display the owner of autocoinage, powerton and dividendpool")
  .addParam("autoCoinageSnapshotAddress", "autoCoinageSnapshot Address")
  .addParam("powerTonAddress", "powerTon Address")
  .addParam("dividendPoolAddress", "dividendPoolTon Address")
  .addParam("ownerAddress", "Owner Address")
  .setAction(async function ({autoCoinageSnapshotAddress, powerTonAddress, dividendPoolAddress, ownerAddress}) {
        const [admin] = await ethers.getSigners();
        let DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
        let ADMIN_ROLE = keccak256("ADMIN_ROLE");

        const autoCoinageSnapshot2 = await ethers.getContractAt("AutoCoinageSnapshot2", autoCoinageSnapshotAddress);
        const powerTONSwapper = await ethers.getContractAt("PowerTONSwapper", powerTonAddress);
        const tokenDividendPool = await ethers.getContractAt("TokenDividendPool", dividendPoolAddress);

        let hasRoleDEFAULT_ADMIN_ROLE = await autoCoinageSnapshot2.connect(admin).hasRole(DEFAULT_ADMIN_ROLE, ownerAddress);
        console.log("AutoCoinageSnapshot2 ownerAddress hasRole(DEFAULT_ADMIN_ROLE) :", hasRoleDEFAULT_ADMIN_ROLE);
        let hasRoleADMIN_ROLE = await autoCoinageSnapshot2.connect(admin).hasRole(ADMIN_ROLE, ownerAddress);
        console.log("AutoCoinageSnapshot2 ownerAddress hasRole(ADMIN_ROLE) :", hasRoleADMIN_ROLE);


        let isAdmin0 = await powerTONSwapper.connect(admin).isAdmin(ownerAddress);
        console.log("PowerTONSwapper ownerAddress isAdmin :", isAdmin0);

        let isAdmin1 = await tokenDividendPool.connect(admin).isAdmin(ownerAddress);
        console.log("TokenDividendPool ownerAddress isAdmin :", isAdmin1);

});


task("change-owner-autocoinage-powerton-dividendpool", "Change the owner of TokenFactory and ProjectToken")
    .addParam("autoCoinageSnapshotAddress", "autoCoinageSnapshot Address")
    .addParam("powerTonAddress", "powerTon Address")
    .addParam("dividendPoolAddress", "dividendPoolTon Address")
    .addParam("newOwnerAddress", "New Owner Address")
    .setAction(async function ({autoCoinageSnapshotAddress, powerTonAddress, dividendPoolAddress, newOwnerAddress}) {

        const [admin] = await ethers.getSigners();
        let DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
        let ADMIN_ROLE = keccak256("ADMIN_ROLE");

        const autoCoinageSnapshot2 = await ethers.getContractAt("AutoCoinageSnapshotProxy2", autoCoinageSnapshotAddress);
        const powerTONSwapper = await ethers.getContractAt("PowerTONSwapper", powerTonAddress);
        const tokenDividendPool = await ethers.getContractAt("TokenDividendPool", dividendPoolAddress);


        let tx = await autoCoinageSnapshot2.connect(admin).addOwner(newOwnerAddress);
        await tx.wait();
        console.log("AutoCoinageSnapshotProxy2 addOwner(newOwnerAddress):  tx:", tx.hash);

        let tx1 = await powerTONSwapper.connect(admin).transferAdmin(newOwnerAddress);
        await tx1.wait();
        console.log("PowerTONSwapper transferAdmin(",newOwnerAddress,") : tx:", tx1.hash);

        let tx2 = await tokenDividendPool.connect(admin).transferAdmin(newOwnerAddress);
        await tx2.wait();
        console.log("TokenDividendPool transferAdmin(",newOwnerAddress,") : tx:", tx1.hash);

});



task("renounce-owner-autocoinage", "renounce the owner of AutocoinageSnapshot2")
    .addParam("autoCoinageSnapshotAddress", "autoCoinageSnapshot Address")
    .setAction(async function ({autoCoinageSnapshotAddress }) {
        const [admin] = await ethers.getSigners();

        let DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
        let ADMIN_ROLE = keccak256("ADMIN_ROLE");

        const autoCoinageSnapshot2 = await ethers.getContractAt("AutoCoinageSnapshotProxy2", autoCoinageSnapshotAddress);

        let tx1 = await autoCoinageSnapshot2.connect(admin).renounceRole(ADMIN_ROLE, admin.address);
        console.log("AutoCoinageSnapshotProxy2 renounceRole(ADMIN_ROLE) :", tx1.hash);

        let tx = await autoCoinageSnapshot2.connect(admin).renounceRole(DEFAULT_ADMIN_ROLE, admin.address);
        console.log("ERC20AFactory renounceRole(DEFAULT_ADMIN_ROLE) :", tx.hash);

        let hasRole1 = await autoCoinageSnapshot2.connect(admin).hasRole(ADMIN_ROLE, admin.address);
        console.log("ERC20AFactory ",admin.address," hasRole(ADMIN_ROLE) :", hasRole1);

        let hasRole = await autoCoinageSnapshot2.connect(admin).hasRole(DEFAULT_ADMIN_ROLE, admin.address);
        console.log("ERC20AFactory ",admin.address," hasRole(DEFAULT_ADMIN_ROLE) :", hasRole);

});

