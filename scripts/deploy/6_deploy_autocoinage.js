const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");
const AutoCoinageSnapshotABI  = require("../../abi/AutoCoinageSnapshot.json");
async function main() {
    const [admin] = await hre.ethers.getSigners();
    await hre.ethers.provider.send("hardhat_setBalance", [
      admin.address,
      "0x56BC75E2D63100000",
    ]);

    let name = "TON Staked"
    let symbol = "TST"

    // let deployedAddress="0x01d0c76C08dA157a52a633D02e6266366C157a03";
    // const autoCoinageSnapshot = await hre.ethers.getContractAt(AutoCoinageSnapshotABI.abi, deployedAddress, hre.ethers.provider);
    const AutoCoinageSnapshot = await hre.ethers.getContractFactory("AutoCoinageSnapshot");
    const autoCoinageSnapshot = await AutoCoinageSnapshot.deploy(name, symbol);

    let tx = await autoCoinageSnapshot.deployed();

    console.log("tx:", tx.deployTransaction.hash);
    console.log("AutoCoinageSnapshot deployed to:", autoCoinageSnapshot.address);


    let user = '0x3b9878ef988b086f13e5788ecab9a35e74082ed9';
    let layer2Address = "0x1fa621d238f30f6651ddc8bd5f4be21c6b894426";

    let SeigManagerAddress = "0x957DaC3D3C4B82088A4939BE9A8063e20cB2efBE";
    let Layer2RegistryAddress = "0xA609Cb2b9b0A4845077D2C965B7C6DFE5F59c847";

    await autoCoinageSnapshot.connect(admin).setAddress(SeigManagerAddress, Layer2RegistryAddress);
    await autoCoinageSnapshot.snapshot(layer2Address);


    // await run("verify", {
    //   address: autoCoinageSnapshot.address,
    //   constructorArgsParams: [name, symbol],
    // });

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
