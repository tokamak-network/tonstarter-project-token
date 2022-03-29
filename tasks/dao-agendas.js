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

const executeAgenda = async (daoAgendaManager, agendaID) => {
    const can = await daoAgendaManager.canExecuteAgenda(agendaID);
    expect(can).to.be.eq(true);
    receipt = await (await daoCommittee.executeAgenda(agendaID)).wait();
}

const voteAgenda = async(candidateContract, candidate, agendaID, vote) => {
    await (await candidateContract.connect(candidate).castVote(agendaID, vote, "test comment")).wait()
}