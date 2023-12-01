const hre = require("hardhat");
require("dotenv").config();
async function main() {
  const [admin] = await hre.ethers.getSigners();

  const info = {
    impl: "0x68808D5379763fA07FDb53c707100e1930900F5c",
    wton: "0x79e0d92670106c85e9067b56b8f674340dca0bbd",
    tos: "0xff3ef745d9878afe5934ff0b130868afddbc58e8",
    uniswapRouter: "0x0000000000000000000000000000000000000000",
    autocoinageSnapshot: "0x0000000000000000000000000000000000000000",
    layer2Registry: "0x0000000000000000000000000000000000000000",
    seigManager: "0x0000000000000000000000000000000000000000",
  };

  const PowerTONSwapperProxy = await hre.ethers.getContractFactory(
    "PowerTONSwapperProxy"
  );
  const powerTONSwapperProxy = await PowerTONSwapperProxy.deploy(
    info.impl,
    info.wton,
    info.tos,
    info.uniswapRouter,
    info.autocoinageSnapshot,
    info.layer2Registry,
    info.seigManager
  );

  const tx = await powerTONSwapperProxy.deployed();

  console.log("tx:", tx.deployTransaction.hash);
  console.log("PowerTONSwapper deployed to:", powerTONSwapperProxy.address);

  await run("verify", {
    address: powerTONSwapperProxy.address,
    constructorArgsParams: [
      info.impl,
      info.wton,
      info.tos,
      info.uniswapRouter,
      info.autocoinageSnapshot,
      info.layer2Registry,
      info.seigManager,
    ],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
