

describe("TokenDividendPool", function() {
    let admin, user1, user2;
    let tokenA;
    let dividendPool;

    let erc20;

    
    const totalSupply = 100;

    before(async () => {
        [admin, distributor, user1, user2, user3, user4] = await ethers.getSigners();

        const TokenAContract = await ethers.getContractFactory("ERC20A");
        tokenA = await TokenAContract.connect(admin).deploy(
            "TokenA",
            "TA",
            totalSupply,
            admin.address
        );
        await tokenA.deployed();


        const TokenDividendPoolImplContract = await ethers.getContractFactory("TokenDividendPool");
        const dividendPoolImpl = await TokenDividendPoolImplContract.connect(admin).deploy();
        await dividendPoolImpl.deployed();

        const TokenDividendPoolProxyContract = await ethers.getContractFactory("TokenDividendPoolProxy");
        const dividendPoolProxy = await TokenDividendPoolProxyContract.connect(admin).deploy(dividendPoolImpl.address, admin.address);
        await dividendPoolProxy.deployed();

        dividendPool = await ethers.getContractAt("TokenDividendPool", dividendPoolProxy.address);  

        const ERC20Contract = await ethers.getContractFactory("TestERC20");
        erc20 = await ERC20Contract.connect(admin).deploy("TestERC20", "ER");
        await erc20.deployed(); 
    });

    const distribute = (distributor, distributeAmount) => {
        await (
            await erc20.connect(admin).mint(distributor.address, distributeAmount)
        ).wait();
        await (
            await erc20.connect(distributor).approve(dividendPool.address, distributeAmount)
        ).wait();
        await (
            await dividendPool.connect(distributor).distribute(erc20.address, distributeAmount)
        ).wait();
    }

    it("should distribute", async () => {
        distribute(distributor, 10000);
    });

    it("should mint", async () => {
        const amount = 10000;
        await (
            await tokenA.connect(admin).mint(user1.address, amount)
        ).wait();

        await (
            await tokenA.connect(admin).mint(user2.address, amount)
        ).wait();
        
        await (
            await tokenA.connect(admin).mint(user3.address, amount)
        ).wait();
        
        await (
            await tokenA.connect(admin).mint(user4.address, amount)
        ).wait();
        
    });
})