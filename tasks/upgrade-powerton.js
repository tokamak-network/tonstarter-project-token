const fs = require("fs");

const { keccak256 } = require("web3-utils");

task("upgrade-powerton-swapper1", "")
  .addParam("powerTonProxy", "PowerTonProxy")
  .setAction(async function ({ powerTonProxy }) {
    const [admin] = await ethers.getSigners();

    // await hre.ethers.provider.send("hardhat_setBalance", [
    //   admin.address,
    //   "0x56BC75E2D63100000",
    // ]);
    const PowerTONSwapper1 = await ethers.getContractFactory(
      "PowerTONSwapper1"
    );
    const powerTONSwapper1 = await PowerTONSwapper1.connect(admin).deploy();
    await powerTONSwapper1.deployed();

    console.log("PowerTONSwapper1 Deployed:", powerTONSwapper1.address);

    const PowerTONSwapperProxyABI = JSON.parse(
      await fs.readFileSync("./abi/PowerTONSwapperProxy.json")
    ).abi;

    const powerTONSwapperProxyContract = new ethers.Contract(
      powerTonProxy,
      PowerTONSwapperProxyABI,
      ethers.provider
    );

    await (
      await powerTONSwapperProxyContract
        .connect(admin)
        .upgradeTo(powerTONSwapper1.address)
    ).wait();

    console.log("PowerTONSwapperProxy  upgradeTo:", powerTONSwapper1.address);

    await run("verify", {
      address: powerTONSwapper1.address,
      constructorArgsParams: [],
    });
  });

task("upgrade-powerton-hammerdao", "")
  .addParam("powerTonProxy", "PowerTonProxy")
  .addParam("wtonAddress")
  .addParam("autocoinageSnapshotAddress")
  .addParam("seigManagerAddress")
  .addParam("dividiedPoolAddress")
  .setAction(async function ({
    powerTonProxy,
    wtonAddress,
    autocoinageSnapshotAddress,
    seigManagerAddress,
    dividiedPoolAddress,
  }) {
    const [admin] = await ethers.getSigners();

    const PowerTONHammerDAO = await ethers.getContractFactory(
      "PowerTONHammerDAO"
    );
    const powerTONHammerDAO = await PowerTONHammerDAO.connect(admin).deploy();
    await powerTONHammerDAO.deployed();

    console.log("PowerTONHammerDAO Deployed:", powerTONHammerDAO.address);

    const PowerTONSwapperProxyABI = JSON.parse(
      await fs.readFileSync("./abi/PowerTONSwapperProxy.json")
    ).abi;

    const powerTONSwapperProxyContract = new ethers.Contract(
      powerTonProxy,
      PowerTONSwapperProxyABI,
      ethers.provider
    );

    await (
      await powerTONSwapperProxyContract
        .connect(admin)
        .upgradeTo(powerTONHammerDAO.address)
    ).wait();

    console.log(
      "PowerTONSwapperProxy  upgradeTo PowerTONHammerDAO :",
      powerTONHammerDAO.address
    );

    const powerTONHammerDAOABI = JSON.parse(
      await fs.readFileSync("./abi/PowerTONHammerDAO.json")
    ).abi;

    const powerTONHammerDAOContract = new ethers.Contract(
      powerTonProxy,
      powerTONHammerDAOABI,
      ethers.provider
    );

    await (
      await powerTONHammerDAOContract
        .connect(admin)
        .setInfo(
          wtonAddress,
          autocoinageSnapshotAddress,
          seigManagerAddress,
          dividiedPoolAddress
        )
    ).wait();

    console.log("PowerTONSwapperProxy  setInfo ");

    await run("verify", {
      address: powerTONHammerDAO.address,
      constructorArgsParams: [],
    });
  });
