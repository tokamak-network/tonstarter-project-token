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
  
    const layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
    let stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
    console.log("Stakers count: ", stakers.length);
    stakers = stakers.filter((v, idx, self) => self.indexOf(v) === idx);
    console.log("Stakers count: ", stakers.length);

    const stakesOfAllUsers = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers.json"));
    for (const layer2 of layer2s) {
      let totalSupply = ethers.BigNumber.from(0);
      for (const staker of stakers) {
        const staked = stakesOfAllUsers[layer2][staker];
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
      console.log("Difference: ", totalSupply.sub(totalSupplyExpected).toString(), "wei")
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