const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");
const AutoCoinageSnapshotABI  = require("../../abi/AutoCoinageSnapshot.json");
async function main() {
    const [admin] = await hre.ethers.getSigners();

    let user = '0x3b9878ef988b086f13e5788ecab9a35e74082ed9';
    let deployedAddress="0x87FFa3391B836e0606F071752A1e4FAadf959266";

    const autoCoinageSnapshot = await hre.ethers.getContractAt(AutoCoinageSnapshotABI.abi, deployedAddress, hre.ethers.provider);

    let layer2Address = "0x1fa621d238f30f6651ddc8bd5f4be21c6b894426";
    let SeigManagerAddress = "0x957DaC3D3C4B82088A4939BE9A8063e20cB2efBE";
    let Layer2RegistryAddress = "0xA609Cb2b9b0A4845077D2C965B7C6DFE5F59c847";


    let getLayer2TotalSupplyInTokamak =  await autoCoinageSnapshot.getLayer2TotalSupplyInTokamak(layer2Address);
    console.log("getLayer2TotalSupplyInTokamak:", getLayer2TotalSupplyInTokamak);

    let getLayer2BalanceOfInTokamak =  await autoCoinageSnapshot.getLayer2BalanceOfInTokamak(layer2Address, user);
    console.log("getLayer2BalanceOfInTokamak:", getLayer2BalanceOfInTokamak);


    let syncBatchOnline =  await autoCoinageSnapshot.connect(admin).syncBatchOnline(layer2Address, [user]);
    console.log("syncBatchOnline:", syncBatchOnline);

    let getCurrentLayer2SnapshotId =  await autoCoinageSnapshot.getCurrentLayer2SnapshotId(layer2Address);
    console.log("getCurrentLayer2SnapshotId:", getCurrentLayer2SnapshotId);

    //let balanceOf =  await autoCoinageSnapshot.balanceOf(layer2Address, user);
    let balanceOfInLayer2 =  await autoCoinageSnapshot["balanceOf(address,address)"](layer2Address, user);
    console.log("balanceOf(address,address):", balanceOfInLayer2);

    let balanceOf =  await autoCoinageSnapshot["balanceOf(address)"](user);
    console.log("balanceOf(address):", balanceOf);

    let totalSupplyLayer2 =  await autoCoinageSnapshot["totalSupply(address)"](layer2Address);
    console.log("totalSupplyLayer2:", totalSupplyLayer2);

    let totalSupply =  await autoCoinageSnapshot["totalSupply()"]();
    console.log("totalSupply:", totalSupply);

    let currentAccountBalanceSnapshots =  await autoCoinageSnapshot.currentAccountBalanceSnapshots(layer2Address, user);
    console.log("currentAccountBalanceSnapshots:", currentAccountBalanceSnapshots);

    let currentTotalSupplySnapshots =  await autoCoinageSnapshot.currentTotalSupplySnapshots(layer2Address);
    console.log("currentTotalSupplySnapshots:", currentTotalSupplySnapshots);


    let currentFactorSnapshots =  await autoCoinageSnapshot.currentFactorSnapshots(layer2Address);
    console.log("currentFactorSnapshots:", currentFactorSnapshots);

    // let updateBatchOnline =  await autoCoinageSnapshot.connect(admin).syncBatchOnline(layer2Address, [user]);
    // console.log("updateBatchOnline:", updateBatchOnline);

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
