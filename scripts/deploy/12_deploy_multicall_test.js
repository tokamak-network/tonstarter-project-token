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

    const MultiDelegateCallSample = await hre.ethers.getContractFactory("MultiDelegateCallSample");
    const multiDelegateCallSample = await MultiDelegateCallSample.deploy();

    let tx = await multiDelegateCallSample.deployed();

    console.log("tx:", tx.deployTransaction.hash);
    console.log("multiDelegateCallSample deployed to:", multiDelegateCallSample.address);

    await run("verify", {
      address: multiDelegateCallSample.address,
      constructorArgsParams: [],
    });
    /*
    const Hello = await hre.ethers.getContractFactory("Hello");
    const hello = await Hello.deploy();

    tx = await hello.deployed();

    console.log("tx:", tx.deployTransaction.hash);
    console.log("hello deployed to:", hello.address);

    // await run("verify", {
    //   address: hello.address,
    //   constructorArgsParams: [],
    // });
    */
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
