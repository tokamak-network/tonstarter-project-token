const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");

async function main() {
  const [admin] = await hre.ethers.getSigners();

  const SimplePowerTON = await hre.ethers.getContractFactory("SimplePowerTON");
  const simplePowerTON = await SimplePowerTON.deploy();

  let tx = await simplePowerTON.deployed();

  console.log("tx:", tx.deployTransaction.hash);
  console.log("projectTokenProxy deployed to:", simplePowerTON.address);

  let _wton = "0x709bef48982Bbfd6F2D4Be24660832665F53406C";
  let _tos = "0x44d4F5d89E9296337b8c48a332B3b2fb2C190CD0";
  let _uniswapRouter = "0xe592427a0aece92de3edee1f18e0157c05861564";
  let _erc20Recorder = "0xb4A09aB4B1a12c38A00b6298D04D98d1583b72C6";
  let _layer2Registry = "0xA609Cb2b9b0A4845077D2C965B7C6DFE5F59c847";
  let _seigManager = "0x957DaC3D3C4B82088A4939BE9A8063e20cB2efBE";

  await (await simplePowerTON.connect(admin).setInfo(
     _wton, _tos, _uniswapRouter, _layer2Registry, _seigManager
    )).wait();

  await run("verify", {
    address: simplePowerTON.address,
    constructorArgsParams: [],
  });

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
