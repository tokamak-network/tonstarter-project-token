const { ethers } = require("hardhat");
const fs = require('fs');

async function validateTotalSupply() {
    const coinageABI = JSON.parse(await fs.readFileSync("./abi/autoRefactorCoinage.json")).abi;
  
    const seigManagerAddress = "0x710936500aC59e8551331871Cbad3D33d5e0D909";
    const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).result;
    const seigManager = new ethers.Contract(
      seigManagerAddress,
      seigManagerABI,
      ethers.provider
    );
  
  
    const stakesOfAllUsers = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers.json"));
      for (const layer2 in stakesOfAllUsers) {
      const stakersInfo = stakesOfAllUsers[layer2];
      let totalSupply = ethers.BigNumber.from(0);
      for (const staker in stakersInfo) {
        const staked = stakersInfo[staker];
        totalSupply = totalSupply.add(staked);
      }
      const coinageAddress = seigManager.coinages(layer2);
  
      const autoRefactorCoinage = new ethers.Contract(
        coinageAddress,
        coinageABI,
        ethers.provider
      );
    
      totalSupplyExpected = await autoRefactorCoinage.totalSupply();
      console.log("Layer2: ", layer2);
      console.log("Total sum: ", totalSupply.toString());
      console.log("Total supply expected: ", totalSupplyExpected.toString())
      console.log();
    }
  
}

async function main() {
  await validateTotalSupply();
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });