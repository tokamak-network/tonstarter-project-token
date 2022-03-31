const chai = require("chai");
const fs = require('fs');

const { expect } = chai;
const { getPlasmaContractsMainnet } = require("./helpers/get-plasma-contracts");
const { time } = require("@openzeppelin/test-helpers");
const UniswapEnv = require("./uniswap/uniswap-env");
const balance = require("@openzeppelin/test-helpers/src/balance");
const { getLayer2List, getStakersList, getTONStakedAmount, erc20RecorderMint } = require("./helpers/ton-stakers");

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
    const gasUsedInfo = {mintBatch: []};
    let candidates;

    before(async () => {
          
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
        await (await tokenRecorder.grantRole(tokenRecorder.MINTER_ROLE(), daoCommittee.address)).wait();

        const ERC20Contract = await ethers.getContractFactory("TestERC20");

        erc20A = await ERC20Contract.connect(admin).deploy("TestERC20A", "ERA");
        await erc20A.deployed(); 
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

        const agendaFee = await daoAgendaManager.createAgendaFees();
        
        let receipt = null;
        try {
            receipt = await (await ton.connect(tonHolder).approveAndCall(
                daoCommittee.address,
                agendaFee,
                param
            )).wait();
        } catch (e) {
            return -1;
        }

        totalGasUsed += parseInt(receipt.gasUsed)
        const agendaID = parseInt(await daoAgendaManager.numAgendas()) - 1;
        let agenda = await daoAgendaManager.agendas(agendaID);
        const { noticeEndTimestamp } = agenda;

        await setTimeTo(noticeEndTimestamp);
        for (const { candidate, candidateContract } of candidates) {
            const vote = 1; // YES
            receipt = await (await candidateContract.connect(candidate).castVote(agendaID, vote, "test comment", )).wait()
            totalGasUsed += parseInt(receipt.gasUsed)
        }

        agenda = await daoAgendaManager.agendas(agendaID);
        const { votingEndTimestamp } = agenda;

        const currentTime = await time.latest();
        if (currentTime < votingEndTimestamp) {
          await setTimeTo(votingEndTimestamp);
        }

        const can = await daoAgendaManager.canExecuteAgenda(agendaID);
        expect(can).to.be.eq(true);
        receipt = await (await daoCommittee.executeAgenda(agendaID)).wait();    
        totalGasUsed += parseInt(receipt.gasUsed)    
        return totalGasUsed;
    } 
    const deposit = async (user, layer2Name, depositAmount) => {
        await (await wton.connect(owner).mint(user.address, depositAmount)).wait();
        await (await wton.connect(user).approve(depositManager.address, depositAmount)).wait();
        const allowance = await wton.allowance(user.address, depositManager.address);
        expect(allowance).to.be.eq(depositAmount);
        const balanceInitial = await tokenRecorder.balanceOf(user.address);
        const receipt = await (await depositManager.connect(user).deposit(layer2Name, depositAmount)).wait();
        const balanceLast = await tokenRecorder.balanceOf(user.address);
        return parseInt(receipt.gasUsed);
    }

    it("should deposit", async() => {
        // let depositGasUsed = 0;
        // let depositCounter = 0;
        // for (const user of users) {
        //     for (const layer2Name of layer2s) {
        //         depositGasUsed += await deposit(user, layer2Name, 100000000);
        //         depositCounter += 1;
        //     }
        // }
        // gasUsedInfo['depositBeforeAverage'] = depositGasUsed / depositCounter;
    });

    it("should withdraw", async() => {
        // let withdrawGasUsed = 0;
        // let withdrawCounter = 0;
        // for (const user of users) {
        //     for (const layer2Name of layer2s) {
        //         // const balance = await seigManager.stakeOf(layer2Name, user.address);
        //         // const randomAmount = getRandom(1000);
        //         withdrawGasUsed += (await withdraw(user, layer2Name, 1000000));
        //         withdrawCounter += 1;
        //     }
        // }        
        // gasUsedInfo['withdrawBeforeAverage'] = withdrawGasUsed / withdrawCounter;
    });


    it("should disable staking", async () => {
        //const receipt = await (await depositManager.connect(owner).setSeigManager(randomAccount.address)).wait();
        // const gasUsed = receipt.gasUsed;        
        const gasUsed = await createAgendaAndExecute({
            target: depositManager.address,
            sig: "setSeigManager(address)",
            paramTypes: ["address"],
            params: [randomAccount.address]
        });
        gasUsedInfo['setRandomSeigManager'] = gasUsed;
    });

    it("should mint wtons", async () => {
        for (const user of users) {
            const balanceInitial = await wton.balanceOf(user.address);
            const mintAmount = 1000000000;
            await (await wton.connect(owner).mint(user.address, mintAmount)).wait();
            const balanceLast = await wton.balanceOf(user.address);
            expect(balanceLast.sub(balanceInitial)).to.be.eq(mintAmount);
        }
    });

    const withdraw = async (user, layer2Name, amount) => {
        const balanceInitial = await tokenRecorder.balanceOf(user.address);
        const receipt = await (await depositManager.connect(user).requestWithdrawal(layer2Name, amount)).wait();        
        const balanceLast = await tokenRecorder.balanceOf(user.address);
        return parseInt(receipt.gasUsed);
    }

    const sleep = async (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    it("should mint from saved data", async () => {  
        // await getLayer2List(layer2Registry.address);
        // await getStakersList(depositManager.address, 14215307);
        // await getTONStakedAmount(seigManager.address);
        // await erc20RecorderMint(tokenRecorder.address);
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
            amounts.push(totalStaked.toString());

            // if (accounts.length == 100) {
            //     console.log(accounts.length);
            //     console.log({ accounts, amounts });
                
            //     const gasUsed = await createAgendaAndExecute({
            //         target: tokenRecorder.address,
            //         sig: "mintBatch(address[],uint256[])",
            //         paramTypes: ["address[]", "uint256[]"],
            //         params: [accounts, amounts]
            //     });
            //     if (gasUsed == -1) {
            //         break;
            //     }
            //     gasUsedInfo['mintBatch'].push({ gasUsed, length: accounts.length });
            //     await sleep(2000);
            //     // // await (await tokenRecorder.connect(admin).mintBatch(accounts, amounts)).wait();
            //     accounts = [];
            //     amounts = [];
            // } 
        }

        if (accounts.length > 0) {
            console.log(accounts.length);
            const receipt = await (await tokenRecorder.connect(admin).mintBatch(accounts, amounts)).wait();
            const gasUsed = receipt.gasUsed;
            gasUsedInfo['mintBatch'] = gasUsed;

            // const gasUsed = await createAgendaAndExecute({
            //     target: tokenRecorder.address,
            //     sig: "mintBatch(address[],uint256[])",
            //     paramTypes: ["address[]", "uint256[]"],
            //     params: [accounts, amounts]
            // });
            // // gasUsedInfo['mintBatch'] = gasUsed;
            // gasUsedInfo['mintBatch'].push({ gasUsed, length: accounts.length }); 
        }          
    });

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

        const totAddress = await seigManager.tot();
        const tot = await ethers.getContractAt("AutoRefactorCoinage", totAddress);
        console.log(await tot.totalSupply(), await tokenRecorder.totalSupply())
        // expect(await tot.totalSupply()).to.be.eq(await tokenRecorder.totalSupply());
    });

    it("should upgrade power ton", async () => {
        const powerTON = await (await ethers.getContractFactory("PowerTONSwapper"))
            .connect(admin)
            .deploy(randomAccount.address, randomAccount.address, randomAccount.address, tokenRecorder.address, layer2Registry.address, seigManager.address);
        await powerTON.deployed();
        await (await powerTON.connect(admin).init()).wait();

        // await (await seigManager.connect(owner).setPowerTON(powerTON.address)).wait();
        const gasUsed = await createAgendaAndExecute({
            target: seigManager.address,
            sig: "setPowerTON(address)",
            paramTypes: ["address"],
            params: [powerTON.address]
        });
        gasUsedInfo['updateSeigniorage'] = gasUsed; 

        await (await tokenRecorder.grantRole(tokenRecorder.MINTER_ROLE(), powerTON.address)).wait();
        await (await tokenRecorder.grantRole(tokenRecorder.BURNER_ROLE(), powerTON.address)).wait();
    });



    it("should enable deposit manager", async() => {
        // const receipt = await (await depositManager.connect(owner).setSeigManager(seigManager.address)).wait();
        // const gasUsed = receipt.gasUsed;
        // gasUsedInfo['setValidSeigManager'] = gasUsed;   
        
        const gasUsed = await createAgendaAndExecute({
            target: depositManager.address,
            sig: "setSeigManager(address)",
            paramTypes: ["address"],
            params: [seigManager.address]
        });
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
    
        const receipt = await (await seigManager.connect(coinage).updateSeigniorage()).wait();
        const gasUsed = receipt.gasUsed;
        gasUsedInfo['updateSeigniorage'] = gasUsed;  
        // const gasUsed = await createAgendaAndExecute({
        //     target: seigManager.address,
        //     sig: "updateSeigniorage()",
        //     paramTypes: [],
        //     params: []
        // });
        // gasUsedInfo['updateSeigniorage'] = gasUsed; 

        await ethers.provider.send("evm_increaseTime", [dur]);
        await ethers.provider.send("evm_mine");
    });

    // it("should deposit", async() => {
    //     let depositGasUsed = 0;
    //     let depositCounter = 0;
    //     for (const user of users) {
    //         for (const layer2Name of layer2s) {
    //             depositGasUsed += await deposit(user, layer2Name, 100000000);
    //             depositCounter += 1;
    //         }
    //     }
    //     gasUsedInfo['depositAfterAverage'] = depositGasUsed / depositCounter;
        
    //     for (const user of users) {
    //         const balance = await tokenRecorder.balanceOf(user.address);
    //         console.log(user.address, balance)
    //     }
    // });

    it("should withdraw", async() => {
        let withdrawGasUsed = 0;
        let withdrawCounter = 0;
        
        for (const user of users) {
            for (const layer2Name of layer2s) {
                const balance = await seigManager.stakeOf(layer2Name, user.address);
                const randomAmount = getRandom(1000);
                withdrawGasUsed += (await withdraw(user, layer2Name, 50000000));
                withdrawCounter += 1;
            }
        }
        
        gasUsedInfo['withdrawAfterAverage'] = withdrawGasUsed / withdrawCounter;

        for (const user of users) {
            const balance = await tokenRecorder.balanceOf(user.address);
            console.log(user.address, balance)
        }
    });

    const distribute = async (distributor, erc20, distributeAmount) => {
        await (await erc20.connect(admin).mint(distributor.address, distributeAmount)).wait();
        await (await erc20.connect(distributor).approve(dividendPool.address, distributeAmount)).wait();
        await (await dividendPool.connect(distributor).distribute(erc20.address, distributeAmount)).wait();
    }

    it("should distribute and check", async () => {
        await distribute(distributor, erc20A, 1000);
        for (const user of users) {
            const balance = await tokenRecorder.balanceOf(user.address);
            const totalSupply = await tokenRecorder.totalSupply();
            
            const claimable = parseInt(await dividendPool.claimable(erc20A.address, user.address));
            const totalDistribution = parseInt(await dividendPool.totalDistribution(erc20A.address));
            console.log(user.address, balance, claimable, totalDistribution, totalSupply);
        }
    });

    it("should show gas used", async () => {
        console.log({ gasUsedInfo });
    });

});
