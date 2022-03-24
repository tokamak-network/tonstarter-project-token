const { ethers } = require("hardhat");

task("deploy-erc20-recorder", async function () {
    const adminAddress = "";
    const ownerAddress = "";
    const depositManagerAddress = "";
    const admin = await ethers.getSigner(adminAddress);

    const tokenRecorderContract = await ethers.getContractFactory("ERC20Recorder");
    tokenRecorder = await tokenRecorderContract.connect(admin).deploy(
        "Recorder",
        "RCR",
        ownerAddress,
        depositManagerAddress
    );
    await tokenRecorder.deployed();
});

task("deploy-token-dividend-pool", async function() {
    const adminAddress = "";
    const erc20RecorderAddress = "";

    const admin = await ethers.getSigner(adminAddress);

    const TokenDividendPoolImplContract = await ethers.getContractFactory("TokenDividendPool");
    const dividendPoolImpl = await TokenDividendPoolImplContract.connect(admin).deploy();
    await dividendPoolImpl.deployed();

    const TokenDividendPoolProxyContract = await ethers.getContractFactory("TokenDividendPoolProxy");
    const dividendPoolProxy = await TokenDividendPoolProxyContract.connect(admin).deploy(dividendPoolImpl.address, admin.address);
    await dividendPoolProxy.deployed();
    await (await dividendPoolProxy.connect(admin).initialize(erc20RecorderAddress)).wait();

    dividendPool = await ethers.getContractAt("TokenDividendPool", dividendPoolProxy.address);
})

task("deploy-power-ton-swapper", async function () {
    const wtonAddress = "";
    const tosAddress = "";
    const uniswapRouterAddress = "";
    const erc20RecorderAddress = "";
    const layer2RegistryAddress = "";
    const seigManagerAddress = "";

    const powerTON = await (await ethers.getContractFactory("PowerTONSwapper"))
        .connect(admin)
        .deploy(wtonAddress, tosAddress, uniswapRouterAddress, erc20RecorderAddress, layer2RegistryAddress, seigManagerAddress);
    await powerTON.deployed();
    // await (await powerTON.connect(admin).init()).wait();
});
