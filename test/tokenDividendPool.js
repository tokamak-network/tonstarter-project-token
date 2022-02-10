
const { expect } = require("chai");

describe("TokenDividendPool", function() {
    let admin, distributor, depositManager, user1, user2, user3, user4;
    let tokenA;
    let dividendPool;
    let erc20;
    const totalSupply = 100;

    before(async () => {
        [
            admin,
            distributor,
            depositManager,
            user1,
            user2,
            user3,
            user4
        ] = await ethers.getSigners();

        const TokenAContract = await ethers.getContractFactory("ERC20Recorder");
        tokenA = await TokenAContract.connect(admin).deploy(
            "TokenA",
            "TA",
            admin.address,
            depositManager.address
        );
        await tokenA.deployed();

        const TokenDividendPoolImplContract = await ethers.getContractFactory("TokenDividendPool");
        const dividendPoolImpl = await TokenDividendPoolImplContract.connect(admin).deploy();
        await dividendPoolImpl.deployed();

        const TokenDividendPoolProxyContract = await ethers.getContractFactory("TokenDividendPoolProxy");
        const dividendPoolProxy = await TokenDividendPoolProxyContract.connect(admin).deploy(dividendPoolImpl.address, admin.address);
        await dividendPoolProxy.deployed();
        await (await dividendPoolProxy.connect(admin).initialize(tokenA.address)).wait();

        dividendPool = await ethers.getContractAt("TokenDividendPool", dividendPoolProxy.address);  

        await (await tokenA.grantRole(tokenA.SNAPSHOT_ROLE(), dividendPool.address)).wait();

        const ERC20Contract = await ethers.getContractFactory("TestERC20");
        erc20 = await ERC20Contract.connect(admin).deploy("TestERC20", "ER");
        await erc20.deployed(); 
    });
    
    const makeBalance = async (token, user, amount) => {
        // empty balance
        const balance = await token.balanceOf(user.address);
        await (await token.connect(depositManager).burnFrom(user.address, balance)).wait();
        expect(await token.balanceOf(user.address)).to.be.eq(0);

        // send amount
        await (await token.connect(depositManager).mint(user.address, amount)).wait();
        expect(await token.balanceOf(user.address)).to.be.eq(amount);
    };

    it("should create balances", async () => {
        const amount1 = 10;
        await makeBalance(tokenA, user1, amount1);

        const amount2 = 15;
        await makeBalance(tokenA, user2, amount2);

        const amount3 = 25;
        await makeBalance(tokenA, user3, amount3);

        const amount4 = 50;
        await makeBalance(tokenA, user4, amount4);
    });

    const distribute = async (distributor, distributeAmount) => {
        await (await erc20.connect(admin).mint(distributor.address, distributeAmount)).wait();
        await (await erc20.connect(distributor).approve(dividendPool.address, distributeAmount)).wait();
        await (await dividendPool.connect(distributor).distribute(erc20.address, distributeAmount)).wait();
    }

    it("should distribute", async () => {
        await distribute(distributor, 100000000);
    });

    const claim = async (user, expecectedAmount, erc20) => {
        const claimable = parseInt(await dividendPool.connect(admin).claimable(erc20.address, user.address));
        expect(claimable).to.be.eq(expecectedAmount);
        const initialBalance = await erc20.balanceOf(user.address);
        await (await dividendPool.connect(user).claim(erc20.address)).wait();
        const lastBalance = await erc20.balanceOf(user.address);
        expect(lastBalance - initialBalance).to.be.eq(expecectedAmount);
    }

    it("should check claimable amount and claim", async () => {
        await claim(user1, 10000000, erc20);
        await claim(user2, 15000000, erc20);
        await claim(user3, 25000000, erc20);
        await claim(user4, 50000000, erc20);
    });
    

    it("should change balances", async () => {
        const amount1 = 3;
        await makeBalance(tokenA, user1, amount1);

        const amount2 = 5;
        await makeBalance(tokenA, user2, amount2);

        const amount3 = 1;
        await makeBalance(tokenA, user3, amount3);

        const amount4 = 1;
        await makeBalance(tokenA, user4, amount4);
    });


    it("should distribute again", async () => {
        await distribute(distributor, 100000000);
    });

    it("should check claimable amount and claim", async () => {
        await claim(user1, 30000000, erc20);
        await claim(user2, 50000000, erc20);
        await claim(user3, 10000000, erc20);
        await claim(user4, 10000000, erc20);
    });    
})