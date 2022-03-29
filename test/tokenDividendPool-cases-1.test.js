const chai = require("chai");
const fs = require('fs');

const { expect } = chai;
const { setupPlasmaContracts } = require("./helpers/setup-plasma-contracts");
const { time } = require("@openzeppelin/test-helpers");
const UniswapEnv = require("./uniswap/uniswap-env");
const balance = require("@openzeppelin/test-helpers/src/balance");
const { ethers } = require("hardhat");

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
    let layer2s = [], stakers, stakesOfAllUsers;
    let layer2Address;
    let autoRefactorCoinage;
    const gasUsedInfo = {mintBatch: []};
    let candidates;

    before(async () => {
        [
            admin,
            tonHolder,
            distributor,
            depositManager,
            randomAccount,
            user1,
            user2,
            user3,
            user4,
            user5,
            user6
        ] = await ethers.getSigners();
        users = [user1, user2, user3, user4, user5, user6];

        ({
          candidates,
          depositManager,
          daoCommittee,
          seigManager,
          layer2Registry,
          owner,
          wton,
          coinage,
          ton,
          layer2,
          tot
        } = await setupPlasmaContracts(admin.address));

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

        const ERC20Contract = await ethers.getContractFactory("TestERC20");

        erc20A = await ERC20Contract.connect(admin).deploy("TestERC20A", "ERA");
        await erc20A.deployed(); 

        const seigManagerImp = await impersonate(seigManager.address);
        await (await seigManager.setMinimumAmount(1000)).wait();
        const minimumAmount = await seigManager.minimumAmount();
        console.log({ minimumAmount });
        const coinageAddress = await seigManager.coinages(layer2.address);
        const coinageA = await ethers.getContractAt("AutoRefactorCoinage", coinageAddress);
        const operator = await layer2.operator();
        await (await coinageA.connect(seigManagerImp).mint(operator, minimumAmount)).wait();
    });

    const getBalancesInfo = async (user) => {
        const staked = await seigManager.stakeOf(layer2Address, user.address);
        const balance = await tokenRecorder.balanceOf(user.address);
        return { staked, balance };
    }

    const printBalances = async (user) => {
        console.log("USER - ", user.address);
        const { staked, balance } = await getBalancesInfo(user);
        console.log("Staked: ", staked.toString());
        console.log("Balance: ", balance.toString());
        console.log();
        return { staked, balance };
    }

    const setTimeTo = async (t) => {
        await ethers.provider.send("evm_setNextBlockTimestamp", [parseInt(t)]);
        await ethers.provider.send("evm_mine");
    }

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

    const deposit = async (user, layer2Name, depositAmount) => {
        depositAmount = ethers.utils.parseEther(depositAmount.toString());
        await (await wton.connect(admin).mint(user.address, depositAmount)).wait();
        await (await wton.connect(user).approve(depositManager.address, depositAmount)).wait();
        const allowance = await wton.allowance(user.address, depositManager.address);
        expect(allowance).to.be.eq(depositAmount);
        const balanceInitial = await tokenRecorder.balanceOf(user.address);
        const receipt = await (await depositManager.connect(user).deposit(layer2Name, depositAmount)).wait();
        const balanceLast = await tokenRecorder.balanceOf(user.address);

        const coinageTotalSupply = await tot.totalSupply();
        const recorderTotalSupply = await tokenRecorder.totalSupply();
        
        return {
            depositAmount,
            mintAmount: balanceLast.sub(balanceInitial),
            coinageTotalSupply,
            recorderTotalSupply
        };
    }

    const withdraw = async (user, layer2Name, amount) => {
        amount = ethers.utils.parseEther(amount.toString());

        const balanceInitial = await tokenRecorder.balanceOf(user.address);
        const receipt = await (await depositManager.connect(user).requestWithdrawal(layer2Name, amount)).wait();        
        const balanceLast = await tokenRecorder.balanceOf(user.address);

        const coinageTotalSupply = await tot.totalSupply();
        const recorderTotalSupply = await tokenRecorder.totalSupply();
        return {
            burnAmount: balanceLast.sub(balanceInitial),
            withdrawAmount: amount,
            coinageTotalSupply,
            recorderTotalSupply
        };
    }

    it("should find layer2", async() => {
        // const numberOfLayer2s = await layer2Registry.numLayer2s()
        // for (let i = 0; i < numberOfLayer2s; i++) {
        //   layer2s.push(await layer2Registry.layer2ByIndex(i))
        // }
        layer2Address = await layer2Registry.layer2ByIndex(0);
    })

    it("should deposit 1", async() => {
        await printBalances(user1);
        await printBalances(user2);
        
        const { 
            depositAmount: depositAmount1,
            mintAmount: mintAmount1,
            coinageTotalSupply: coinageTotalSupply1,
            recorderTotalSupply: recorderTotalSupply1,
        } = await deposit(user1, layer2Address, 50000);
        console.log({ coinageTotalSupply1, recorderTotalSupply1, mintAmount1, depositAmount1 });
        
        const { 
            depositAmount: depositAmount2,
            mintAmount: mintAmount2,
            coinageTotalSupply: coinageTotalSupply2,
            recorderTotalSupply: recorderTotalSupply2,
        } = await deposit(user2, layer2Address, 100000);
        console.log({ coinageTotalSupply2, recorderTotalSupply2, mintAmount2, depositAmount2 });
        
        await printBalances(user1);
        await printBalances(user2);
    });



    it("should withdraw 1", async() => {
        await printBalances(user1);
        await printBalances(user2);

        const { 
            withdrawAmount: withdrawAmount1,
            burnAmount: burnAmount1,
            coinageTotalSupply: coinageTotalSupply1,
            recorderTotalSupply: recorderTotalSupply1,
        } = await withdraw(user1, layer2Address, 50000);
        console.log({ coinageTotalSupply1, recorderTotalSupply1, burnAmount1, withdrawAmount1 });
        
        const { 
            withdrawAmount: withdrawAmount2,
            burnAmount: burnAmount2,
            coinageTotalSupply: coinageTotalSupply2,
            recorderTotalSupply: recorderTotalSupply2,
        } = await withdraw(user2, layer2Address, 25000);
        console.log({ coinageTotalSupply2, recorderTotalSupply2, burnAmount2, withdrawAmount2 });

        await printBalances(user1);
        await printBalances(user2);
    });

    it ("should mint for tokenRecorder", async () => {
        await (await tokenRecorder.connect(admin).mint(user1.address, ethers.utils.parseEther("10000"))).wait();
        await (await tokenRecorder.connect(admin).mint(user2.address, ethers.utils.parseEther("10000"))).wait();
    })

    it("should upgrade power ton", async () => {
        const powerTON = await (await ethers.getContractFactory("PowerTONSwapper"))
            .connect(admin)
            .deploy(randomAccount.address, randomAccount.address, randomAccount.address, tokenRecorder.address, layer2Registry.address, seigManager.address);
        await powerTON.deployed();
        await (await powerTON.connect(admin).init()).wait();
        await (await seigManager.connect(admin).setPowerTON(powerTON.address)).wait();
        await (await tokenRecorder.grantRole(tokenRecorder.MINTER_ROLE(), powerTON.address)).wait();
        await (await tokenRecorder.grantRole(tokenRecorder.BURNER_ROLE(), powerTON.address)).wait();
    });

    let totalSupplyRatio = null;
    it("should deposit 2", async() => {
        await printBalances(user1);
        await printBalances(user2);

        const { 
            depositAmount: depositAmount1,
            mintAmount: mintAmount1,
            coinageTotalSupply: coinageTotalSupply1,
            recorderTotalSupply: recorderTotalSupply1,
        } = await deposit(user1, layer2Address, 100000);
        totalSupplyRatio = coinageTotalSupply1.div(recorderTotalSupply1);

        const { 
            depositAmount: depositAmount2,
            mintAmount: mintAmount2,
            coinageTotalSupply: coinageTotalSupply2,
            recorderTotalSupply: recorderTotalSupply2,
        } = await deposit(user2, layer2Address, 100000);

        expect(
            coinageTotalSupply1.div(recorderTotalSupply1)
        ).to.be.eq(coinageTotalSupply2.div(recorderTotalSupply2));
        expect(
            coinageTotalSupply1.div(recorderTotalSupply1)
        ).to.be.eq(coinageTotalSupply2.div(recorderTotalSupply2));

        // expect(
        //     coinageTotalSupply1.mul(mintAmount1)
        // ).to.be.eq(recorderTotalSupply1.mul(depositAmount1));
        
        // expect(
        //     coinageTotalSupply2.mul(mintAmount2)
        // ).to.be.eq(recorderTotalSupply2.mul(depositAmount2));

        console.log({ coinageTotalSupply2, recorderTotalSupply2, mintAmount2, depositAmount2 });

        await printBalances(user1);
        await printBalances(user2);
    });

    it("should withdraw 2", async() => {
        await printBalances(user1);
        await printBalances(user2);

        const { 
            withdrawAmount: withdrawAmount1,
            burnAmount: burnAmount1,
            coinageTotalSupply: coinageTotalSupply1,
            recorderTotalSupply: recorderTotalSupply1,
        } = withdraw(user1, layer2Address, 50000);
        console.log({ coinageTotalSupply1, recorderTotalSupply1, burnAmount1, withdrawAmount1 });
        
        const { 
            withdrawAmount: withdrawAmount2,
            burnAmount: burnAmount2,
            coinageTotalSupply: coinageTotalSupply2,
            recorderTotalSupply: recorderTotalSupply2,
        } = await withdraw(user2, layer2Address, 25000);
        console.log({ coinageTotalSupply2, recorderTotalSupply2, burnAmount2, withdrawAmount2 });

        expect(
            coinageTotalSupply1.div(recorderTotalSupply1)
        ).to.be.eq(coinageTotalSupply2.div(recorderTotalSupply2));
        expect(
            coinageTotalSupply1.div(recorderTotalSupply1)
        ).to.be.eq(coinageTotalSupply2.div(recorderTotalSupply2));

        expect(
            coinageTotalSupply1.mul(burnAmount1)
        ).to.be.eq(recorderTotalSupply1.mul(burnAmount1));
        
        expect(
            coinageTotalSupply2.mul(burnAmount2)
        ).to.be.eq(recorderTotalSupply2.mul(withdrawAmount2));

        await printBalances(user1);
        await printBalances(user2);
    });

    it("should update seignorage", async () => {
        const dur = parseInt(time.duration.days(30));
        await ethers.provider.send("evm_increaseTime", [dur]);
        await ethers.provider.send("evm_mine");
        const coinage = await impersonate(layer2.address);
        await (await seigManager.connect(coinage).updateSeigniorage()).wait();
        await ethers.provider.send("evm_increaseTime", [dur]);
        await ethers.provider.send("evm_mine");
    });

    it("should deposit 3", async() => {
        await printBalances(user1);
        await printBalances(user2);

        await deposit(user1, layer2Address, 100000);
        await deposit(user2, layer2Address, 100000);

        await printBalances(user1);
        await printBalances(user2);
    });

    it("should withdraw 3", async() => {
        await printBalances(user1);
        await printBalances(user2);

        await withdraw(user1, layer2Address, 100000);
        await withdraw(user2, layer2Address, 100000);

        await printBalances(user1);
        await printBalances(user2);
    });

    const distribute = async (distributor, erc20, distributeAmount) => {
        await (await erc20.connect(admin).mint(distributor.address, distributeAmount)).wait();
        await (await erc20.connect(distributor).approve(dividendPool.address, distributeAmount)).wait();
        await (await dividendPool.connect(distributor).distribute(erc20.address, distributeAmount)).wait();
    }

    it("should distribute and check", async () => {
        await distribute(distributor, erc20A, 1000);
        const allUsers = [user1, user2];
        for (const user of allUsers) {
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
