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
    await (await ton.connect(creator).approveAndCall(
        daoCommittee.address,
        agendaFee,
        param
    )).wait();

    const agendaID = parseInt(await daoAgendaManager.numAgendas()) - 1;
    let agenda = await daoAgendaManager.agendas(agendaID);
    return { agendaID, agenda };
}

const executeAgenda = async (daoAgendaManager, agendaID, executor) => {
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
    .addParam("agendaID", "")
    .addParam("daoAgendaManagerAddress", "")
    .setAction(async ({ daoAgendaManagerAddress, agendaID }) => {
        const daoAgendaManagerABI = JSON.parse(await fs.readFileSync("./abi/daoAgendaManager.json")).abi;
        const daoAgendaManager = new ethers.Contract(
            daoAgendaManagerAddress,
            daoAgendaManagerABI,
            ethers.provider
        );
        const [admin] = await ethers.getSigners();
        await executeAgenda(daoAgendaManager, agendaID, admin);
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
        const [admin] = await ethers.getSigners()
        const { agendaID } = await createAgenda(daoAgendaManager, args, admin);
        console.log("Agenda Created:", agendaID);
    });





