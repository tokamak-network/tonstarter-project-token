const fs = require("fs");
function unmarshalString (str) {
    if (str.slice(0, 2) === '0x') return str.slice(2);
    return str;
}
const createAgenda = async (daoAgendaManager, { target, sig, params, paramTypes }, creator) => {
    let totalGasUsed = 0;
    const noticePeriod = await daoAgendaManager.minimumNoticePeriodSeconds();
    const votingPeriod = await daoAgendaManager.minimumVotingPeriodSeconds();

    const targets = [target];
    const functionBytecodes = [];
    const selector = web3.eth.abi.encodeFunctionSignature(sig);
    functionBytecodes.push(selector.concat(unmarshalString(
        web3.eth.abi.encodeParameters(
          paramTypes,
          params
        )))
    );
    const param = web3.eth.abi.encodeParameters(
        ["address[]", "uint128", "uint128", "bool", "bytes[]"],
        [targets, noticePeriod.toString(), votingPeriod.toString(), true, functionBytecodes]
    );

    const agendaFee = await daoAgendaManager.connect(creator).createAgendaFees();
    const tonAddress = "0x44d4F5d89E9296337b8c48a332B3b2fb2C190CD0";
    const tonABI = JSON.parse(await fs.readFileSync("./abi/TON.json")).abi;
    const ton = new ethers.Contract(
        tonAddress,
        tonABI,
        ethers.provider
    );

    let receipt = null;
    const daoCommitteeAddress = "0x543550A8B8528A7Bcb4Ca42230F4a8C8117cdFDb";
    await (await ton.connect(creator).approveAndCall(
        daoCommitteeAddress,
        agendaFee,
        param
    )).wait();

    const agendaID = parseInt(await daoAgendaManager.numAgendas()) - 1;
    let agenda = await daoAgendaManager.agendas(agendaID);
    return { agendaID, agenda };
}

const executeAgenda = async (daoAgendaManager, agendaID, executor) => {
    //const daoCommitteeABI = JSON.parse(await fs.readFileSync("./abi/daoCommittee.json")).abi;
    let daoCommitteeAddress = '0x543550A8B8528A7Bcb4Ca42230F4a8C8117cdFDb';
    const daoCommitteeABI = require("../abi/daoCommittee.json").abi;
        const daoCommittee = new ethers.Contract(
            daoCommitteeAddress,
            daoCommitteeABI,
            ethers.provider
        );

    const can = await daoAgendaManager.canExecuteAgenda(agendaID);
    if (!can) {
        console.log("CANNOT BE EXECUTED");
    } else {
        await (await daoCommittee.connect(executor).executeAgenda(agendaID)).wait();
    }
}

const voteAgenda = async(candidateContract, candidate, agendaID, vote) => {
    await (await candidateContract.connect(candidate).castVote(agendaID, vote, "test comment")).wait()
}

task("execute-agenda", "")
    .addParam("agendaId", "")
    .addParam("daoAgendaManagerAddress", "")
    .setAction(async ({ daoAgendaManagerAddress, agendaId }) => {
        const daoAgendaManagerABI = JSON.parse(await fs.readFileSync("./abi/daoAgendaManager.json")).abi;
        const daoAgendaManager = new ethers.Contract(
            daoAgendaManagerAddress,
            daoAgendaManagerABI,
            ethers.provider
        );
        console.log("agendaId", agendaId);
        const [admin] = await ethers.getSigners();
        await executeAgenda(daoAgendaManager, agendaId, admin);
    });


task("create-transfer-ownership-seig-manager-agenda", "")
.addParam("daoAgendaManagerAddress", "")
.addParam("newOwnerAddress", "")
.addParam("seigManagerAddress", "")
.setAction(async ({ daoAgendaManagerAddress, newOwnerAddress, seigManagerAddress }) => {
    const daoAgendaManagerABI = JSON.parse(await fs.readFileSync("./abi/daoAgendaManager.json")).abi;
    const daoAgendaManager = new ethers.Contract(
        daoAgendaManagerAddress,
        daoAgendaManagerABI,
        ethers.provider
    );

    const args = {
        target: seigManagerAddress,
        sig: "transferOwnership(address)",
        paramTypes: ["address"],
        params: [newOwnerAddress]
    }
    console.log("seigManagerAddress:", seigManagerAddress);
    console.log("newOwnerAddress:", newOwnerAddress);

    const [admin] = await ethers.getSigners()
    const { agendaID } = await createAgenda(daoAgendaManager, args, admin);
    console.log("Agenda Created:", agendaID);
});


task("create-set-seig-manager-agenda", "")
    .addParam("daoAgendaManagerAddress", "")
    .addParam("depositManagerAddress", "")
    .addParam("seigManagerAddress", "")
    .setAction(async ({ daoAgendaManagerAddress, depositManagerAddress, seigManagerAddress }) => {
        const daoAgendaManagerABI = JSON.parse(await fs.readFileSync("./abi/daoAgendaManager.json")).abi;
        const daoAgendaManager = new ethers.Contract(
            daoAgendaManagerAddress,
            daoAgendaManagerABI,
            ethers.provider
        );

        const args = {
            target: depositManagerAddress,
            sig: "setSeigManager(address)",
            paramTypes: ["address"],
            params: [seigManagerAddress]
        }
        const [admin] = await ethers.getSigners()
        const { agendaID } = await createAgenda(daoAgendaManager, args, admin);
        console.log("Agenda Created:", agendaID);
    });

task("create-set-power-ton-agenda", "")
    .addParam("daoAgendaManagerAddress", "")
    .addParam("powerTonAddress", "")
    .addParam("seigManagerAddress", "")
    .setAction(async ({ daoAgendaManagerAddress, powerTonAddress, seigManagerAddress }) => {
        const daoAgendaManagerABI = JSON.parse(await fs.readFileSync("./abi/daoAgendaManager.json")).abi;
        const daoAgendaManager = new ethers.Contract(
            daoAgendaManagerAddress,
            daoAgendaManagerABI,
            ethers.provider
        );

        const args = {
            target: seigManagerAddress,
            sig: "setPowerTON(address)",
            paramTypes: ["address"],
            params: [powerTonAddress]
        }
        console.log("seigManagerAddress:", seigManagerAddress);
        console.log("powerTonAddress:", powerTonAddress);

        const [admin] = await ethers.getSigners()
        const { agendaID } = await createAgenda(daoAgendaManager, args, admin);
        console.log("Agenda Created:", agendaID);
    });





task("get-power-ton", "")
    .addParam("seigManagerAddress", "")
    .setAction(async ({ seigManagerAddress }) => {
        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );
        const powerTon = await seigManager.powerton();
        console.log("powerTon :", powerTon);
    });


task("get-power-ton-rate", "")
    .addParam("seigManagerAddress", "")
    .addParam("wtonAddress", "")
    .setAction(async ({ seigManagerAddress, wtonAddress }) => {
        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );
        const powerTONSeigRate = await seigManager.powerTONSeigRate();
        console.log("powerTONSeigRate :", powerTONSeigRate.toString());

        const powerTon = await seigManager.powerton();
        console.log("powerTon :", powerTon);
        console.log("wtonAddress :", wtonAddress);
        const wtonABI = JSON.parse(await fs.readFileSync("./abi/WTON.json")).abi;
        const wton = new ethers.Contract(
            wtonAddress,
            wtonABI,
            ethers.provider
        );

        let balanceWton = await wton["balanceOf(address)"](powerTon);
        console.log("balanceWton :", balanceWton);
    });




task("get-stake-ton-of-seig-manager", "")
    .addParam("seigManagerAddress", "")
    .addParam("layerAddress", "")
    .addParam("userAddress", "")
    .setAction(async ({ seigManagerAddress, layerAddress, userAddress }) => {
        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );
        const stakeOf = await seigManager.stakeOf(layerAddress, userAddress);
        console.log("stakeOf of layer2 :", stakeOf);
    });



task("get-stake-tot-of-seig-manager", "")
    .addParam("seigManagerAddress", "")
    .setAction(async ({ seigManagerAddress }) => {
        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );
        const tot = await seigManager.tot();

        const autoRefactorCoinageABI = JSON.parse(await fs.readFileSync("./abi/autoRefactorCoinage.json")).abi;
        const autoRefactorCoinage = new ethers.Contract(
            tot,
            autoRefactorCoinageABI,
            ethers.provider
        );
        const totalSupply = await autoRefactorCoinage.totalSupply();
        console.log("totalSupply of tot (ray):", totalSupply);
        let totalSupplyWei = ethers.utils.formatUnits(totalSupply, 9);
        let end = Math.min(totalSupplyWei.indexOf('.'), totalSupplyWei.length) ;
        console.log("totalSupply of tot (wei):", totalSupplyWei.substring(0,end));

    });

task("get-onwer-of-seig-manager", "")
    .addParam("seigManagerAddress", "")
    .setAction(async ({ seigManagerAddress }) => {
        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );
        const owner = await seigManager.owner();

        console.log("owner of seigManagerAddress :", owner);
    });

    /*
task("is-pauser-of-seig-manager", "")
    .addParam("seigManagerAddress", "")
    .addParam("account", "")
    .setAction(async ({ seigManagerAddress, account }) => {
        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );
        const isPauser = await seigManager.isPauser(account);

        console.log("isPauser of seigManagerAddress :", account, isPauser);
    });


task("add-pauser-of-seig-manager", "")
    .addParam("seigManagerAddress", "")
    .addParam("account", "")
    .setAction(async ({ seigManagerAddress, account }) => {
        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );
        const addPauser = await seigManager.addPauser(account);

        console.log("addPauser of seigManagerAddress :", account, isPauser);
    });
    */

task("set-zero-power-ton-of-seig-manager", "")
    .addParam("seigManagerAddress", "")
    .addParam("dummyAddress", "")
    .setAction(async ({ seigManagerAddress, dummyAddress }) => {
        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );

        const [admin] = await ethers.getSigners()


        const tx = await seigManager.connect(admin).setPowerTON(dummyAddress);

        console.log("setPowerTON of seigManagerAddress :", tx.hash);
    });

task("transfer-owner-of-seig-manager", "")
    .addParam("seigManagerAddress", "")
    .addParam("newOwner", "")
    .setAction(async ({ seigManagerAddress, newOwner }) => {
        const seigManagerABI = JSON.parse(await fs.readFileSync("./abi/seigManager.json")).abi;
        const seigManager = new ethers.Contract(
            seigManagerAddress,
            seigManagerABI,
            ethers.provider
        );

        const [admin] = await ethers.getSigners()

        //const tx = await seigManager.connect(admin).transferOwnership(newOwner);
        const tx = await seigManager.connect(admin)["transferOwnership(address)"](newOwner);

        console.log("transferOwnership of seigManagerAddress :", tx.hash);
    });
