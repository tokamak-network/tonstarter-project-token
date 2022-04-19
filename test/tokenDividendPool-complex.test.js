
const chai = require("chai");

const { expect } = chai;

describe("TokenDividendPool", function() {
    let admin, distributor, depositManager, user1, user2, user3, user4, user5, user6;
    let tokenRecorder;
    let dividendPool;
    let erc20A, erc20B, erc20C;
    let distributeInfos = null;

    before(async () => {
        [
            admin,
            distributor,
            depositManager,
            user1,
            user2,
            user3,
            user4,
            user5,
            user6
        ] = await ethers.getSigners();

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
    
        erc20B = await ERC20Contract.connect(admin).deploy("TestERC20B", "ERB");
        await erc20B.deployed(); 
    
        erc20C = await ERC20Contract.connect(admin).deploy("TestERC20C", "ERC");
        await erc20C.deployed(); 
        
        distributeInfos = {
            [erc20A.address]: [],
            [erc20B.address]: [],
            [erc20C.address]: [],
        };
    });
    
    // helper function
    const increaseBalance = async(user, amount, balanceExpected) => {
        const initialBalance = await tokenRecorder.balanceOf(user.address);
        await (await tokenRecorder.connect(depositManager).mint(user.address, amount)).wait();
        const finalBalance = await tokenRecorder.balanceOf(user.address);
        expect(finalBalance - initialBalance).to.be.eq(amount);
        expect(finalBalance).to.be.eq(balanceExpected);
        return {
            user,
            amount,
            balance: balanceExpected
        };
    }

    // helper function
    const distribute = async (distributor, erc20, distributeAmount, totalDistributionExpected, stateInfo) => {
        await (await erc20.connect(admin).mint(distributor.address, distributeAmount)).wait();
        await (await erc20.connect(distributor).approve(dividendPool.address, distributeAmount)).wait();
        await (await dividendPool.connect(distributor).distribute(erc20.address, distributeAmount)).wait();
        expect(await dividendPool.totalDistribution(erc20.address)).to.be.eq(totalDistributionExpected);
        const snapshotId = parseInt(await tokenRecorder.currentSnapshotId());
        return {
            snapshotId,
            erc20,
            stateInfo,
            distributeAmount,
            totalDistribution: totalDistributionExpected,
        };
    }

    // helper function
    const getTotalAmount = (stateInfo) => {
        let totalAmount = 0;
        for (const { balance } of stateInfo) {
            totalAmount += balance;
        }
        return totalAmount;
    }

    // helper function
    const getAvailableClaims = async (userAddress) => {
        const claims = await dividendPool.connect(admin).getAvailableClaims(userAddress);
        return claims.claimableAmounts.map(
            (_, idx) => ({ amount: claims.claimableAmounts[idx], token: claims.claimableTokens[idx] })
        );
    }

    // helper function
    const getStateDeepCopy = (state) => {
        let newState = [];
        for (const s of state) {
            const { balance, user, amount } = s;
            newState.push({ balance, user, amount });
        }
        return newState;
    }

    // calculateClaimAndCheck 
    const calculateClaimAndCheck = async () => {
        const allAvailableClaims = {};
        for (const erc20Address in distributeInfos) {
            const distributions = distributeInfos[erc20Address];
            const claimableInfo = {};
            for (const { distributeAmount, stateInfo, snapshotId } of distributions) {
                const totalAmount = getTotalAmount(stateInfo);
                expect(await tokenRecorder.totalSupplyAt(snapshotId)).to.be.eq(totalAmount);
                for (let i = 0; i < stateInfo.length; ++i) {
                    const { balance, user, claimed } = stateInfo[i];
                    expect(await tokenRecorder.balanceOfAt(user.address, snapshotId)).to.be.eq(balance);
                    if (claimed && claimed[erc20Address]) {
                        continue;
                    }
        
                    const claimableCalculated = parseInt(distributeAmount * balance / totalAmount);
                    if (user.address in claimableInfo)
                        claimableInfo[user.address] += claimableCalculated;
                    else
                        claimableInfo[user.address] = claimableCalculated;
                    

                }
            }

            for (const userAddress in claimableInfo) {
                const claimableExpected = claimableInfo[userAddress];
                const claimable = await dividendPool.claimable(erc20Address, userAddress);
                expect(claimable).to.be.eq(claimableExpected);
                if (!(userAddress in allAvailableClaims)) {
                    allAvailableClaims[userAddress] = {};
                }
                allAvailableClaims[userAddress][erc20Address] = claimableExpected;
            }
        }


        for (const userAddress in allAvailableClaims) {
            const availableClaims = await getAvailableClaims(userAddress);
            const availableClaimsExpected = allAvailableClaims[userAddress];
            for (const claim of availableClaims) {
                const { amount, token } = claim;
                expect(amount).to.be.eq(availableClaimsExpected[token]);
            }            
        }

    }
    
    const claimBatch = async (thisUser, tokens) => {
        const allClaimables = {};
        const validTokens = [];
        for (const erc20 of tokens) {
            const distributions = distributeInfos[erc20.address];
            let claimableExpected = 0;
            for (const { distributeAmount, stateInfo, snapshotId } of distributions) {
                let userIdx = -1;
                for (let i = 0; i < stateInfo.length; ++i) {
                    if (thisUser.address == stateInfo[i].user.address) {
                        userIdx = i;
                        break;
                    }
                }
                const totalAmount = getTotalAmount(stateInfo);
                expect(await tokenRecorder.totalSupplyAt(snapshotId)).to.be.eq(totalAmount);
    
                const { balance, user, claimed } = stateInfo[userIdx];
                expect(await tokenRecorder.balanceOfAt(user.address, snapshotId)).to.be.eq(balance);
                if (claimed && claimed[erc20.address]) {
                    continue;
                }
    
                const claimableCalculated = parseInt(distributeAmount * balance / totalAmount);
                claimableExpected += claimableCalculated;
                stateInfo[userIdx].claimed = {...claimed, [erc20.address]: true};    
            }
            const claimable = parseInt(await dividendPool.connect(admin).claimable(erc20.address, thisUser.address));
            expect(claimable).to.be.eq(claimableExpected);
            if (claimableExpected > 0) {
                validTokens.push(erc20);
            }
            allClaimables[erc20.address] = claimableExpected;  
        }

        const initialBalances = {};
        for (const erc20 of validTokens) {
            initialBalances[erc20.address] = parseInt(await erc20.balanceOf(thisUser.address));
        }
        
        const tokenAddresses = validTokens.map(t => t.address);
        await (await dividendPool.connect(thisUser).claimBatch(tokenAddresses));
        
        for (const erc20 of validTokens) {
            const balanceDiff = parseInt(await erc20.balanceOf(thisUser.address)) - initialBalances[erc20.address];
            expect(balanceDiff).to.be.eq(allClaimables[erc20.address]);
        }
    }

    const claim = async (thisUser, erc20) => {
        const distributions = distributeInfos[erc20.address];
        let claimableExpected = 0;
        for (const { distributeAmount, stateInfo, snapshotId } of distributions) {
            let userIdx = -1;
            for (let i = 0; i < stateInfo.length; ++i) {
                if (thisUser.address == stateInfo[i].user.address) {
                    userIdx = i;
                    break;
                }
            }

            const totalAmount = getTotalAmount(stateInfo);
            expect(await tokenRecorder.totalSupplyAt(snapshotId)).to.be.eq(totalAmount);

            const { balance, user, claimed } = stateInfo[userIdx];
            expect(await tokenRecorder.balanceOfAt(user.address, snapshotId)).to.be.eq(balance);
            if (claimed && claimed[erc20.address]) {
                continue;
            }

            const claimableCalculated = parseInt(distributeAmount * balance / totalAmount);
            claimableExpected += claimableCalculated;
            stateInfo[userIdx].claimed = {...claimed, [erc20.address]: true};
        }

        const claimable = parseInt(await dividendPool.connect(admin).claimable(erc20.address, thisUser.address));
        expect(claimable).to.be.eq(claimableExpected);
        const initialBalance = await erc20.balanceOf(thisUser.address);
        if (claimableExpected === 0) {
            expect(dividendPool.connect(thisUser).claim(erc20.address)).to.be.revertedWith("Amount to be claimed is zero");
        } else {
            await (await dividendPool.connect(thisUser).claim(erc20.address)).wait();
        }
        const lastBalance = await erc20.balanceOf(thisUser.address);
        expect(lastBalance - initialBalance).to.be.eq(claimableExpected);
        return claimableExpected;
    }

    const claimUpTo = async (thisUser, erc20, thisSnapshotId) => {
        const distributions = distributeInfos[erc20.address];
        let claimableExpected = 0;
        for (const { distributeAmount, stateInfo, snapshotId } of distributions) {
            let userIdx = -1;
            for (let i = 0; i < stateInfo.length; ++i) {
                if (thisUser.address == stateInfo[i].user.address) {
                    userIdx = i;
                    break;
                }
            }

            const totalAmount = getTotalAmount(stateInfo);
            expect(await tokenRecorder.totalSupplyAt(snapshotId)).to.be.eq(totalAmount);

            const { balance, user, claimed } = stateInfo[userIdx];
            expect(await tokenRecorder.balanceOfAt(user.address, snapshotId)).to.be.eq(balance);
            if (claimed && claimed[erc20.address]) {
                continue;
            }
            
            const claimableCalculated = parseInt(distributeAmount * balance / totalAmount);
            
            claimableExpected += claimableCalculated;
            stateInfo[userIdx].claimed = {...claimed, [erc20.address]: true};
            if (thisSnapshotId === snapshotId) { break; }
        }

        const claimable = parseInt(await dividendPool.connect(admin).claimableUpTo(erc20.address, thisUser.address, thisSnapshotId));
        expect(claimable).to.be.eq(claimableExpected);
        const initialBalance = await erc20.balanceOf(thisUser.address);
        if (claimableExpected === 0) {
            expect(dividendPool.connect(thisUser).claimUpTo(erc20.address, thisSnapshotId)).to.be.revertedWith("Amount to be claimed is zero");
        } else {
            await (await dividendPool.connect(thisUser).claimUpTo(erc20.address, thisSnapshotId)).wait();
        }
        const lastBalance = await erc20.balanceOf(thisUser.address);
        expect(lastBalance - initialBalance).to.be.eq(claimableExpected);
        return claimableExpected;
    }


    let stateInfo1 = null;
    it("should increase balances 1", async () => {
        stateInfo1 = [
            {user: user1, amount: 10, balance: 10},
            {user: user2, amount: 10, balance: 10},
            {user: user3, amount: 20, balance: 20},
            {user: user4, amount: 20, balance: 20},
            {user: user5, amount: 0, balance: 0},
            {user: user6, amount: 0, balance: 0},
        ]
    
        for (const { user, amount, balance } of stateInfo1) {
            if (amount == 0) continue;
            await increaseBalance(user, amount, balance);
        }
    });


    it("should distribute 1 (ercA)", async () => {
        const distr = await distribute(distributor, erc20A, 100000000, 100000000, getStateDeepCopy(stateInfo1));
        distributeInfos[erc20A.address].push(distr);
    });

    it("should calculate claims and check 1", async() => {
        await calculateClaimAndCheck();
    });

    let stateInfo2 = [];
    it("should increase balances 2", async () => {
        stateInfo2 = [
            {user: user1, amount: 10, balance: 20},
            {user: user2, amount: 10, balance: 20},
            {user: user3, amount: 40, balance: 60},
            {user: user4, amount: 40, balance: 60},
            {user: user5, amount: 60, balance: 60},
            {user: user6, amount: 50, balance: 50},
        ];
        for (const { user, amount, balance } of stateInfo2) {
            await increaseBalance(user, amount, balance);
        }
    });

    it("should distribute 2 (ercA)", async () => {
        const distr = await distribute(distributor, erc20A, 200000000, 300000000, getStateDeepCopy(stateInfo2));
        distributeInfos[erc20A.address].push(distr);
    });

    it("should distribute 3 (ercB)", async () => {
        const distr = await distribute(distributor, erc20B, 200000000, 200000000, getStateDeepCopy(stateInfo2));
        distributeInfos[erc20B.address].push(distr);
    });

    it("should calculate claims and check 2", async() => {
        await calculateClaimAndCheck();
    });

    it("should claim up to 1", async () => {
        await claimUpTo(user1, erc20A, 1);
        await claimUpTo(user1, erc20A, 2);
    });

    it("should claim 1", async () => {
        await claim(user1, erc20A);
        await claim(user3, erc20A);
        await claim(user5, erc20A);
    
        await claim(user1, erc20B);
        await claim(user2, erc20B);
        await claim(user4, erc20B);
        await claim(user6, erc20B);        
    });

    it("should calculate claims and check 3", async() => {
        await calculateClaimAndCheck();
    });


    let stateInfo3 = null;
    it("should increase balances 3", async () => {
        stateInfo3 = [
            {user: user1, amount: 0, balance: 20},
            {user: user2, amount: 0, balance: 20},
            {user: user3, amount: 40, balance: 100},
            {user: user4, amount: 20, balance: 80},
            {user: user5, amount: 10, balance: 70},
            {user: user6, amount: 30, balance: 80},
        ];
        for (const { user, amount, balance } of stateInfo3) {
            await increaseBalance(user, amount, balance);
        }
    });


    it("should distribute 4 (erc20C)", async () => {
        const distr = await distribute(distributor, erc20C, 700000000, 700000000, getStateDeepCopy(stateInfo3));
        distributeInfos[erc20C.address].push(distr);
    });

    it("should calculate claims and check 4", async() => {
        await calculateClaimAndCheck();
    });

    it("should distribute 5 (erc20A)", async () => {
        const distr = await distribute(distributor, erc20A, 500000000, 800000000, getStateDeepCopy(stateInfo3));
        distributeInfos[erc20A.address].push(distr);
    });

    it("should calculate claims and check 5", async() => {
        await calculateClaimAndCheck();
    });

    it("should distribute 6 (erc20B)", async () => {
        const distr = await distribute(distributor, erc20B, 400000000, 600000000, getStateDeepCopy(stateInfo3));
        distributeInfos[erc20B.address].push(distr);
    });

    it("should calculate claims and check 6", async() => {
        await calculateClaimAndCheck();
    });

    it("should claim 2", async () => {
        await claimBatch(user1, [erc20A, erc20B, erc20C]);
        await claimBatch(user2, [erc20A, erc20C]);

        await claim(user3, erc20A);
        await claim(user4, erc20A);
        await claim(user5, erc20A);
        await claim(user6, erc20A);
        
        await claim(user4, erc20B);
        await claim(user5, erc20B);        
        
        await claim(user3, erc20C);        
    });

    it("should distribute 5 (erc20A)", async () => {
        const distr = await distribute(distributor, erc20A, 200000000, 1000000000, getStateDeepCopy(stateInfo3));
        distributeInfos[erc20A.address].push(distr);
    });

    it("should calculate claims and check 7", async() => {
        await calculateClaimAndCheck();
    });

    it("should claim 3", async () => {
        await claimBatch(user3, [erc20A, erc20B, erc20C]);
        await claimBatch(user4, [erc20A, erc20B, erc20C]);
        await claimBatch(user5, [erc20A, erc20B, erc20C]);

        await claim(user1, erc20A);
        await claim(user2, erc20A);
        await claim(user3, erc20A);
        await claim(user4, erc20A);
        await claim(user5, erc20A);
        await claim(user6, erc20A);

        await claim(user1, erc20B);
        await claim(user2, erc20B);
        await claim(user3, erc20B);
        await claim(user4, erc20B);
        await claim(user5, erc20B);
        await claim(user6, erc20B);

        await claim(user1, erc20C);
        await claim(user2, erc20C);
        await claim(user3, erc20C);
        await claim(user4, erc20C);
        await claim(user5, erc20C);
        await claim(user6, erc20C);
    });

    it("should calculate claims and check 7", async() => {
        await calculateClaimAndCheck();
    });
})