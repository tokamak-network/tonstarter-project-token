const chai = require("chai");
const fs = require('fs');

const { expect } = chai;
const { getPlasmaContractsMainnet } = require("./helpers/get-plasma-contracts");
const { time } = require("@openzeppelin/test-helpers");
const UniswapEnv = require("./uniswap/uniswap-env");
const balance = require("@openzeppelin/test-helpers/src/balance");

describe("TokenDividendPool Migration", function() {
    let admin, distributor, depositManager, user1, user2, user3, user4, user5, user6;
    let tokenRecorder;
    let dividendPool;
    let erc20A, erc20B, erc20C;
    let distributeInfos = null;
    
    let initEntry;
    let ton,
        wton,
        tos,
        stakeRegistry,
        stakeSimple,
        stakeSimpleFactory,
        stake1Vault,
        stakeVaultFactory,
        stakeTONLogic,
        stakeTONProxyFactory,
        stakeTONFactory,
        stakeDefiFactory,
        stakeFactory,
        stake1Logic,
        stake1Proxy,
        stakeEntry,
        swapProxy;
    let layer2s, stakers, stakesOfAllUsers;
    let autoRefactorCoinage;
    const gasUsedInfo = {};
    let candidates;

    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [
              {
                forking: {
                  jsonRpcUrl: "https://mainnet.infura.io/v3/27113ffbad864e8ba47c7d993a738a10",
                  blockNumber: 14215307,
                },
              },
            ],
        });

          
        layer2s = JSON.parse(await fs.readFileSync("./data/layer2s.json"));
        stakers = JSON.parse(await fs.readFileSync("./data/stakers.json"));
        stakesOfAllUsers = JSON.parse(await fs.readFileSync("./data/stakesOfAllUsers.json"));

        [
            admin,
            distributor,
            depositManager,
            randomAccount,
        ] = await ethers.getSigners();
        
        ({
          candidates,
          tonHolder,
          depositManager,
          daoAgendaManager,
          daoCommittee,
          seigManager,
          layer2Registry,
          owner,
          autoRefactorCoinage,
          wton,
          users,
          coinage,
          ton,
        } = await getPlasmaContractsMainnet());
        [user1, user2, user3, user4, user5, user6] = users;

        const tokenRecorderContract = await ethers.getContractFactory("ERC20Recorder");
        tokenRecorder = await tokenRecorderContract.connect(admin).deploy(
            "tokenRecorder",
            "TA",
            admin.address,
            depositManager.address
        );
        await tokenRecorder.deployed();

        const TokenDividendPoolImplContract = await ethers.getContractFactory("TokenDividendPool");
        const dividendPoolImpl = await TokenDividendPoolImplContract.connect(admin).deploy();
        await dividendPoolImpl.deployed();

        const TokenDividendPoolProxyContract = await ethers.getContractFactory("TokenDividendPoolProxy");
        const dividendPoolProxy = await TokenDividendPoolProxyContract.connect(admin).deploy(dividendPoolImpl.address, admin.address);
        await dividendPoolProxy.deployed();
        await (await dividendPoolProxy.connect(admin).initialize(tokenRecorder.address)).wait();

        dividendPool = await ethers.getContractAt("TokenDividendPool", dividendPoolProxy.address);  

        await (await tokenRecorder.grantRole(tokenRecorder.SNAPSHOT_ROLE(), dividendPool.address)).wait();

    });
    function marshalString (str) {
        if (str.slice(0, 2) === '0x') return str;
        return '0x'.concat(str);
    }
    
    function unmarshalString (str) {
        if (str.slice(0, 2) === '0x') return str.slice(2);
        return str;
    }
    
    const setTimeTo = async (t) => {
        await ethers.provider.send("evm_setNextBlockTimestamp", [parseInt(t)]);
        await ethers.provider.send("evm_mine");
    }
    const createAgendaAndExecute = async ({ target, sig, params, paramTypes }) => {
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

        const agendaFee = await daoAgendaManager.createAgendaFees();
        const receipt = await (await ton.connect(tonHolder).approveAndCall(
            daoCommittee.address,
            agendaFee,
            param
        )).wait();

        const agendaID = parseInt(await daoAgendaManager.numAgendas()) - 1;
        const agenda = await daoAgendaManager.agendas(agendaID);
        console.log({ agenda });
        const { noticeEndTimestamp } = agenda;
        console.log({ noticeEndTimestamp });
        await setTimeTo(noticeEndTimestamp);
        for (const { candidate, candidateContract } of candidates) {
            const vote = 1; // YES
            console.log({ candidate: candidate.address, contract: candidateContract.address});
            await (await candidateContract.connect(candidate).castVote(agendaID, vote, "test comment", ))
        }
        const { votingEndTimestamp } = agenda;

        const currentTime = await time.latest();
        if (currentTime < votingEndTimestamp) {
          await setTimeTo(votingEndTimestamp);
        }
        const can = await daoAgendaManager.canExecuteAgenda(agendaID);
        console.log({ can });
    
        // expect(daoAgendaManager.canExecuteAgenda(agendaID)).to.be.eq(true);

        // const agendaAfter = await agendaManager.agendas(agendaID);
        // agendaAfter[AGENDA_INDEX_STATUS].should.be.bignumber.equal(toBN(AGENDA_STATUS_WAITING_EXEC));

        await (await daoCommittee.executeAgenda(agendaID)).wait();        
    } 

    it("should disable staking", async () => {
        const receipt = await (await depositManager.connect(owner).setSeigManager(randomAccount.address)).wait();
        const gasUsed = receipt.gasUsed;
        gasUsedInfo['setRandomSeigManager'] = gasUsed;

        await createAgendaAndExecute({
            target: depositManager.address,
            sig: "setSeigManager(address)",
            paramTypes: ["address"],
            params: [randomAccount.address]
        });
    });

    return;

    it("should mint wtons", async () => {
        for (const user of users) {
            const balanceInitial = await wton.balanceOf(user.address);
            const mintAmount = 1000000000;
            await (await wton.connect(owner).mint(user.address, mintAmount)).wait();
            const balanceLast = await wton.balanceOf(user.address);
            console.log({ balanceInitial, balanceLast });
            expect(balanceLast.sub(balanceInitial)).to.be.eq(mintAmount);
        }
    });

    const deposit = async (user, layer2Name, depositAmount) => {
        await (await wton.connect(owner).mint(user.address, depositAmount)).wait();
        await (await wton.connect(user).approve(depositManager.address, depositAmount)).wait();
        const allowance = await wton.allowance(user.address, depositManager.address);
        expect(allowance).to.be.eq(depositAmount);

        const balanceInitial = await tokenRecorder.balanceOf(user.address);
        await (await depositManager.connect(user).deposit(layer2Name, depositAmount)).wait();
        const balanceLast = await tokenRecorder.balanceOf(user.address);
        // expect(balanceLast.sub(balanceInitial)).to.be.eq(depositAmount);
    }

    const withdraw = async (user, layer2Name, amount) => {
        const balanceInitial = await tokenRecorder.balanceOf(user.address);
        // console.log({ amount, balanceInitial });
        await (await depositManager.connect(user).requestWithdrawal(layer2Name, amount)).wait();
        
        const balanceLast = await tokenRecorder.balanceOf(user.address);

        // expect(balanceInitial.sub(balanceLast)).to.be.eq(amount);
    }
    
    it("should mint from saved data", async () => {        
        let accounts = [];
        let amounts = [];
        const [admin] = await ethers.getSigners();
        for (const staker of stakers) {
            let totalStaked = ethers.BigNumber.from(0);
            for (const layer2 of layer2s) {
                if (!stakesOfAllUsers[layer2]) {
                    continue;
                }
                if (stakesOfAllUsers[layer2][staker]) {
                    totalStaked = totalStaked.add(ethers.BigNumber.from(stakesOfAllUsers[layer2][staker]));
                }
            }
        
            if (totalStaked == 0) {
                continue;
            }
            
            accounts.push(staker);
            amounts.push(totalStaked);

            // if (accounts.length == 100) {
            //     await (await tokenRecorder.connect(admin).mintBatch(accounts, amounts)).wait();
            //     accounts = [];
            //     amounts = [];
            // } 
        }

        if (accounts.length > 0) {
            console.log(accounts.length);
            const receipt = await (await tokenRecorder.connect(admin).mintBatch(accounts, amounts)).wait();
            const gasUsed = receipt.gasUsed;
            gasUsedInfo['mintBatch'] = gasUsed;    
        }          
    })

    it("should check mint amounts", async () => {
        for (const staker of stakers) {
            let totalStaked = ethers.BigNumber.from(0);
            for (const layer2 of layer2s) {
                if (!stakesOfAllUsers[layer2]) {
                    continue;
                }
                if (stakesOfAllUsers[layer2][staker]) {
                    totalStaked = totalStaked.add(ethers.BigNumber.from(stakesOfAllUsers[layer2][staker]));
                }
            }
            expect(await tokenRecorder.balanceOf(staker)).to.be.eq(totalStaked);
        }
    });

    it("should upgrade power ton", async () => {
        const powerTON = await (await ethers.getContractFactory("PowerTONSwapper"))
            .connect(admin)
            .deploy(randomAccount.address, randomAccount.address, randomAccount.address, tokenRecorder.address, layer2Registry.address, seigManager.address);
        await powerTON.deployed();
        await (await powerTON.connect(admin).init()).wait();

        await (await seigManager.connect(owner).setPowerTON(powerTON.address)).wait();

        await (await tokenRecorder.grantRole(tokenRecorder.MINTER_ROLE(), powerTON.address)).wait();
        await (await tokenRecorder.grantRole(tokenRecorder.BURNER_ROLE(), powerTON.address)).wait();
    });



    it("should enable deposit manager", async() => {
        const receipt = await (await depositManager.connect(owner).setSeigManager(seigManager.address)).wait();
        const gasUsed = receipt.gasUsed;
        gasUsedInfo['setValidSeigManager'] = gasUsed;    
    })

    it("should deposit", async() => {
        for (const user of users) {
            for (const layer2Name of layer2s) {
                await deposit(user, layer2Name, 100000000);
            }
        }
        for (const user of users) {
            const balance = await tokenRecorder.balanceOf(user.address);
            console.log(user.address, balance)
        }
    });

    function getRandom(max){
        return Math.floor(Math.random()*(max));
    }
    it("should update seignorage", async () => {
        const dur = parseInt(time.duration.years(1));
        await ethers.provider.send("evm_increaseTime", [dur]);
        await ethers.provider.send("evm_mine");
    
        const receipt = (await seigManager.connect(coinage).updateSeigniorage()).wait();
        const gasUsed = receipt.gasUsed;
        gasUsedInfo['updateSeigniorage'] = gasUsed;    

        await ethers.provider.send("evm_increaseTime", [dur]);
        await ethers.provider.send("evm_mine");
    });
    console.log("new");

    it("should deposit", async() => {
        for (const user of users) {
            for (const layer2Name of layer2s) {
                await deposit(user, layer2Name, 100000000);
            }
        }
        for (const user of users) {
            const balance = await tokenRecorder.balanceOf(user.address);
            console.log(user.address, balance)
        }
    });
    it("should withdraw", async() => {
        for (const user of users) {
            for (const layer2Name of layer2s) {
                const balance = await seigManager.stakeOf(layer2Name, user.address);
                const randomAmount = getRandom(1000);

                await withdraw(user, layer2Name, 100000000);
            }
        }
        for (const user of users) {
            const balance = await tokenRecorder.balanceOf(user.address);
            console.log(user.address, balance)
            await ethers.provider.send("evm_mine");

        }
    });

    it("should show gas used", async () => {
        console.log({ gasUsedInfo });
    })

});
