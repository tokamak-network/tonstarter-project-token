const hre = require("hardhat");
require('dotenv').config()
const {
  keccak256,
} = require("web3-utils");

async function main() {
    const [admin] = await hre.ethers.getSigners();
    // await hre.ethers.provider.send("hardhat_setBalance", [
    //   admin.address,
    //   "0x56BC75E2D63100000",
    // ]);

    const MultiDelegateCall = await hre.ethers.getContractFactory("MultiDelegateCall");
    const multiDelegateCall = await MultiDelegateCall.deploy();

    let tx = await multiDelegateCall.deployed();

    console.log("tx:", tx.deployTransaction.hash);
    console.log("MultiDelegateCall deployed to:", multiDelegateCall.address);

    await run("verify", {
      address: multiDelegateCall.address,
      constructorArgsParams: [],
    });

}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
