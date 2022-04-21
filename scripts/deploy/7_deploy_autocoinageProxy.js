const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");
const AutoCoinageSnapshotABI  = require("../../abi/AutoCoinageSnapshot.json");
async function main() {
    const [admin] = await hre.ethers.getSigners();
    // await hre.ethers.provider.send("hardhat_setBalance", [
    //   admin.address,
    //   "0x56BC75E2D63100000",
    // ]);

    let name = "TON Staked"
    let symbol = "TST"

    // AutoCoinageSnapshot deployed to: 0x87FFa3391B836e0606F071752A1e4FAadf959266

    let logic = "0x43daa6Bb59ABAeb21A20B0783507101af877C19C";
    const AutoCoinageSnapshotProxy = await hre.ethers.getContractFactory("AutoCoinageSnapshotProxy");
    const autoCoinageSnapshotProxy = await AutoCoinageSnapshotProxy.deploy();

    let tx = await autoCoinageSnapshotProxy.deployed();

    console.log("tx:", tx.deployTransaction.hash);
    console.log("AutoCoinageSnapshotProxy deployed to:", autoCoinageSnapshotProxy.address);
    //AutoCoinageSnapshotProxy deployed to: 0xF6FFab82F79d2210B312FD843b0F769e88293bAF


    // let user = '0x3b9878ef988b086f13e5788ecab9a35e74082ed9';
    // let layer2Address = "0x1fa621d238f30f6651ddc8bd5f4be21c6b894426";

    let SeigManagerAddress = "0x957DaC3D3C4B82088A4939BE9A8063e20cB2efBE";
    let Layer2RegistryAddress = "0xA609Cb2b9b0A4845077D2C965B7C6DFE5F59c847";

    await autoCoinageSnapshotProxy.connect(admin).setNameSymbolDecimals(name, symbol, 27);
    await autoCoinageSnapshotProxy.connect(admin).upgradeTo(logic);
    await autoCoinageSnapshotProxy.connect(admin).setAddress(SeigManagerAddress, Layer2RegistryAddress);

    await run("verify", {
      address: autoCoinageSnapshotProxy.address,
      constructorArgsParams: [],
    });

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
