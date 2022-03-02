
const fs = require("fs");
const { ethers } = require("hardhat");

async function getPlasmaContractsMainnet() {
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
    const users = [];
    for (let i = 0; i < 10 && i < stakers.length; ++i) {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [stakers[i]],
        });
        await network.provider.send("hardhat_setBalance", [
            stakers[i],
            "0x10000000000000000000000000",
        ]);
        users.push(await ethers.getSigner(stakers[i]));
    }

    const ownerAddress = "0xdd9f0ccc044b0781289ee318e5971b0139602c26";
    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddress],
    });
    await network.provider.send("hardhat_setBalance", [
        ownerAddress,
        "0x10000000000000000000000000",
      ]);
    const owner = await ethers.getSigner(ownerAddress);

    const depositManagerAddress = '0x56E465f654393fa48f007Ed7346105c7195CEe43';
    const depositManager = await ethers.getContractAt("DepositManager", depositManagerAddress);

    const seigManagerAddress = '0x710936500aC59e8551331871Cbad3D33d5e0D909';
    const seigManager = await ethers.getContractAt("SeigManager", seigManagerAddress);

    const autoRefactorCoinageAddress = '0x99af9e1fbd55c6d6cb89e21274961096088eb830';
    const autoRefactorCoinage = await ethers.getContractAt("AutoRefactorCoinage", autoRefactorCoinageAddress);
    
    
    const wtonAddress = '0xc4a11aaf6ea915ed7ac194161d2fc9384f15bff2';
    const wton = await ethers.getContractAt("WTON", wtonAddress);
    
    return {
        owner,
        users,
        depositManager,
        seigManager,
        autoRefactorCoinage,
        wton
    };
}

module.exports = { getPlasmaContractsMainnet }