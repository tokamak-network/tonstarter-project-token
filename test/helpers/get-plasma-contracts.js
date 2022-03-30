
const fs = require("fs");
const { ethers } = require("hardhat");

async function getPlasmaContractsMainnet() {
    const impersonate = async (account) => {
        await network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [account],
        });
        await network.provider.send("hardhat_setBalance", [
            account,
            "0x10000000000000000000000000",
        ]);
        return ethers.getSigner(account);
    }
    const stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
    const users = [];
    for (let i = 0; i < 5 && i < stakers.length; ++i) {
        users.push(await impersonate(stakers[i]));
    }
    const tonHolderAddress = "0xe3531d70dc3d6123f62bc083a0b89d9a4e4fc148";
    const tonHolder = await impersonate(tonHolderAddress);

    const ownerAddress = "0xdd9f0ccc044b0781289ee318e5971b0139602c26";
    const owner = await impersonate(ownerAddress);

    const coinageAddress = "0x39A13a796A3Cd9f480C28259230D2EF0a7026033";
    const coinage = await impersonate(coinageAddress);

    const depositManagerAddress = '0x56E465f654393fa48f007Ed7346105c7195CEe43';
    const depositManager = await ethers.getContractAt("DepositManager", depositManagerAddress);

    const seigManagerAddress = '0x710936500aC59e8551331871Cbad3D33d5e0D909';
    const seigManager = await ethers.getContractAt("SeigManager", seigManagerAddress);

    const autoRefactorCoinageAddress = '0x99af9e1fbd55c6d6cb89e21274961096088eb830';
    const autoRefactorCoinage = await ethers.getContractAt("AutoRefactorCoinage", autoRefactorCoinageAddress);

    const layer2RegistryAddress = '0x0b3E174A2170083e770D5d4Cf56774D221b7063e';
    const layer2Registry = await ethers.getContractAt("Layer2Registry", layer2RegistryAddress);

    const daoAgendaManagerAddress = "0xcD4421d082752f363E1687544a09d5112cD4f484";
    const daoAgendaManager = await ethers.getContractAt("DAOAgendaManager", daoAgendaManagerAddress);

    const wtonAddress = '0xc4a11aaf6ea915ed7ac194161d2fc9384f15bff2';
    const wton = await ethers.getContractAt("WTON", wtonAddress);
    
    const tonAddress = "0x2be5e8c109e2197d077d13a82daead6a9b3433c5";
    const ton = await ethers.getContractAt("TON", tonAddress);

    const daoCommitteeAddress = "0xdd9f0ccc044b0781289ee318e5971b0139602c26";
    const daoCommittee = await ethers.getContractAt("DAOCommittee", daoCommitteeAddress);

    const candidates = [];
    const candidatesLength = parseInt(await daoCommittee.maxMember());
    for (let i = 0; i < candidatesLength; i++) {
        const candidateAddress = await daoCommittee.members(i);
        let candidate = await impersonate(candidateAddress); 
        const candidateContractAddress = await daoCommittee.candidateContract(candidateAddress);
        const candidateContract = await ethers.getContractAt("Candidate", candidateContractAddress);

        if (await candidateContract.isLayer2Candidate()) {
            const layer2 = await ethers.getContractAt("Layer2", candidateAddress);
            candidate = await impersonate(await layer2.operator());
        }

        // console.log({candidateContractAddress, candidateAddress})
        candidates.push({
            candidate,
            candidateContract
        });
    }

    return {
        candidates,
        tonHolder,
        daoAgendaManager,
        daoCommittee,
        coinage,
        owner,
        users,
        layer2Registry,
        depositManager,
        seigManager,
        autoRefactorCoinage,
        wton,
        ton
    };
}

module.exports = { getPlasmaContractsMainnet }