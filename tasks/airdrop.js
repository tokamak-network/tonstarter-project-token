const fs = require('fs');


task("get-balance", "Show the balance of sTOS and TON Staked")
    .addParam("lockTosAddress", "LockTos Address")
    .addParam("autoCoinageSnapshot2Address", "AutoCoinageSnapshot2 Address")
    .addParam("account", "account")
    .setAction(async ({ lockTosAddress, autoCoinageSnapshot2Address, account}) => {
      console.log('lockTosAddress', lockTosAddress);
      console.log('autoCoinageSnapshot2Address', autoCoinageSnapshot2Address);

      const lockTOSABI = require("../abi/LockTOS.json").abi;
      const autoCoinageSnapshot2ABI = require("../abi/AutoCoinageSnapshot2.json").abi;

      const lockTOS = new ethers.Contract(
          lockTosAddress,
          lockTOSABI,
          ethers.provider
      );
      const autoCoinageSnapshot2 = new ethers.Contract(
          autoCoinageSnapshot2Address,
          autoCoinageSnapshot2ABI,
          ethers.provider
      );

      let lockTOS_balance = await lockTOS.balanceOf(account);
      let autoCoinageSnapshot2_balance = await autoCoinageSnapshot2['balanceOf(address)'](account);

      console.log('lockTOS_balance', lockTOS_balance);
      console.log('autoCoinageSnapshot2_balance', autoCoinageSnapshot2_balance);
    })

task("get-allowance-amount", "Show the allowance")
    .addParam("erc20TokenAddress", "erc20Token Address")
    .addParam("lockTosDividendPoolAddress", "lockTosDividendPool Address")
    .addParam("tokenDividendPoolAddress", "tokenDividendPool Address")
    .addParam("account", "account")
    .setAction(async ({ erc20TokenAddress, lockTosDividendPoolAddress, tokenDividendPoolAddress, account }) => {

      console.log('erc20TokenAddress', erc20TokenAddress);
      console.log('lockTosDividendPoolAddress', lockTosDividendPoolAddress);
      console.log('tokenDividendPoolAddress', tokenDividendPoolAddress);

      const erc20TokenABI = require("../abi/ERC20A.json").abi;
      const erc20Token = new ethers.Contract(
          erc20TokenAddress,
          erc20TokenABI,
          ethers.provider
      );

        let allowance0 = await erc20Token.allowance(account, lockTosDividendPoolAddress);
        let allowance1 = await erc20Token.allowance(account, tokenDividendPoolAddress);

        console.log('allowance (lockTosDividendPoolAddress)', allowance0);
        console.log('allowance (tokenDividendPoolAddress)', allowance1);

    })

  task("approve-to-locktos-dividend", "Show the allowance")
    .addParam("erc20TokenAddress", "erc20Token Address")
    .addParam("lockTosDividendPoolAddress", "lockTosDividendPool Address")
    .addParam("amount", "token Amount")
    .setAction(async ({ erc20TokenAddress, lockTosDividendPoolAddress, amount }) => {
      const [admin] = await ethers.getSigners();
      console.log('erc20TokenAddress', erc20TokenAddress);
      console.log('lockTosDividendPoolAddress', lockTosDividendPoolAddress);
      console.log('amount', amount);

      const erc20TokenABI = require("../abi/ERC20A.json").abi;
      const erc20Token = new ethers.Contract(
          erc20TokenAddress,
          erc20TokenABI,
          ethers.provider
      );

        let tx = await erc20Token.connect(admin).approve(lockTosDividendPoolAddress, amount);
        await tx.wait();

        console.log('tx.hash', tx.hash);

    })


task("approve-to-token-dividend", "Show the allowance")
  .addParam("erc20TokenAddress", "erc20Token Address")
  .addParam("tokenDividendPoolAddress", "tokenDividendPool Address")
  .addParam("amount", "token Amount")
  .setAction(async ({ erc20TokenAddress, tokenDividendPoolAddress, amount }) => {
    const [admin] = await ethers.getSigners();
    console.log('erc20TokenAddress', erc20TokenAddress);
    console.log('tokenDividendPoolAddress', tokenDividendPoolAddress);
    console.log('amount', amount);

    const erc20TokenABI = require("../abi/ERC20A.json").abi;
    const erc20Token = new ethers.Contract(
        erc20TokenAddress,
        erc20TokenABI,
        ethers.provider
    );

      let tx = await erc20Token.connect(admin).approve(tokenDividendPoolAddress, amount);
      await tx.wait();

      console.log('tx.hash', tx.hash);

  })

task("distribute-stos-holders", "distribute ")
    .addParam("erc20TokenAddress", "erc20Token Address")
    .addParam("amount", "token Amount")
    .addParam("lockTosDividendPoolAddress", "lockTosDividendPool Address")
    .setAction(async ({ erc20TokenAddress,  amount, lockTosDividendPoolAddress}) => {

      const [admin] = await ethers.getSigners();

      console.log('erc20TokenAddress', erc20TokenAddress);
      console.log('amount', amount);
      console.log('lockTosDividendPoolAddress', lockTosDividendPoolAddress);

      // const tokenDividendPoolABI = require("../abi/TokenDividendPool.json").abi;
      const lockTOSDividendABI = require("../abi/LockTOSDividend.json").abi;

      const lockTOSDividend = new ethers.Contract(
          lockTosDividendPoolAddress,
          lockTOSDividendABI,
          ethers.provider
      );

      let claimable = await lockTOSDividend.connect(admin).claimable(admin.address, erc20TokenAddress);
      console.log('claimable', claimable);

      let tx = await lockTOSDividend.connect(admin).distribute(erc20TokenAddress, amount);
      console.log('distribute tx', tx.hash);
      await tx.wait();

      claimable = await lockTOSDividend.connect(admin).claimable(admin.address, erc20TokenAddress);
      console.log('claimable', claimable);

    })

task("distribute-ton-stakers", "distribute ")
    .addParam("erc20TokenAddress", "erc20Token Address")
    .addParam("amount", "token Amount")
    .addParam("tokenDividendPoolAddress", "tokenDividendPool Address")
    .setAction(async ({ erc20TokenAddress,  amount, tokenDividendPoolAddress}) => {
      console.log('erc20TokenAddress', erc20TokenAddress);
      console.log('amount', amount);
      console.log('tokenDividendPoolAddress', tokenDividendPoolAddress);

      const [admin] = await ethers.getSigners();


      const tokenDividendPoolABI = require("../abi/TokenDividendPool.json").abi;

      const tokenDividendPool = new ethers.Contract(
          tokenDividendPoolAddress,
          tokenDividendPoolABI,
          ethers.provider
      );

      let claimable = await tokenDividendPool.connect(admin).claimable(erc20TokenAddress, admin.address);
      console.log('claimable', claimable);

      let tx = await tokenDividendPool.connect(admin).distribute(erc20TokenAddress, amount);
      console.log('distribute tx', tx.hash);
      await tx.wait();

      claimable = await tokenDividendPool.connect(admin).claimable(erc20TokenAddress, admin.address);
      console.log('claimable', claimable);

    })

task("claimable-all", "distribute ")
    .addParam("erc20TokenAddress", "erc20Token Address")
    .addParam("lockTosDividendPoolAddress", "lockTosDividendPool Address")
    .addParam("tokenDividendPoolAddress", "tokenDividendPool Address")
    .addParam("account", "account")
    .setAction(async ({ erc20TokenAddress,  lockTosDividendPoolAddress, tokenDividendPoolAddress, account}) => {
      console.log('erc20TokenAddress', erc20TokenAddress);
      console.log('lockTosDividendPoolAddress', lockTosDividendPoolAddress);
      console.log('tokenDividendPoolAddress', tokenDividendPoolAddress);
      console.log('account', account);


      const tokenDividendPoolABI = require("../abi/TokenDividendPool.json").abi;
      const tokenDividendPool = new ethers.Contract(
          tokenDividendPoolAddress,
          tokenDividendPoolABI,
          ethers.provider
      );

      const lockTOSDividendABI = require("../abi/LockTOSDividend.json").abi;
      const lockTOSDividend = new ethers.Contract(
          lockTosDividendPoolAddress,
          lockTOSDividendABI,
          ethers.provider
      );

      let claimable_stos = await lockTOSDividend.claimable(account, erc20TokenAddress);
      console.log('claimable (lockTOSDividend)', account, claimable_stos);

      let claimable_tonstaker = await tokenDividendPool.claimable(erc20TokenAddress, account);
      console.log('claimable (tokenDividendPool)', account, claimable_tonstaker);

    })

task("multi-delegatecall-claim-all", "execute claim using multi-call")
  .addParam("erc20Token1Address", "erc20Token1 Address")
  .addParam("erc20Token2Address", "erc20Token2 Address")
  .addParam("multicallAddress", "multicallAddress Address")
  .addParam("lockTosDividendPoolAddress", "lockTosDividendPool Address")
  .addParam("tokenDividendPoolAddress", "tokenDividendPool Address")
  .setAction(async ({ erc20Token1Address,  erc20Token2Address, multicallAddress, lockTosDividendPoolAddress, tokenDividendPoolAddress}) => {
    console.log('erc20Token1Address', erc20Token1Address);
    console.log('erc20Token2Address', erc20Token2Address);
    console.log('multicallAddress', multicallAddress);
    console.log('lockTosDividendPoolAddress', lockTosDividendPoolAddress);
    console.log('tokenDividendPoolAddress', tokenDividendPoolAddress);

    const [admin] = await ethers.getSigners();

    const tokenDividendPoolABI = require("../abi/TokenDividendPool.json").abi;
    const tokenDividendPool = new ethers.Contract(
        tokenDividendPoolAddress,
        tokenDividendPoolABI,
        ethers.provider
    );

    const estimatedGas = await tokenDividendPool.estimateGas.claim(erc20Token2Address);
    //console.log('estimatedGas',estimatedGas);
    let gasLimit = Math.floor(parseInt(estimatedGas)*6);
   // gasLimit = 2000000;
    //const populateTransaction1 = await tokenDividendPool.populateTransaction.claim(erc20Token1Address);
    //console.log('populateTransaction1',populateTransaction1);

    const populateTransaction2 = await tokenDividendPool.populateTransaction.claim(erc20Token2Address);
    //console.log('populateTransaction2',populateTransaction2);

    // let call_1 = {
    //   address: tokenDividendPoolAddress,
    //   gasLimit: gasLimit,
    //   callData: populateTransaction1.data
    // }

    let call_2 = {
      address: tokenDividendPoolAddress,
      gasLimit: gasLimit,
      callData: populateTransaction2.data
    }

    //console.log('call_1',call_1);
    console.log('call_2',call_2);

    // let tx = await multiDelegateCall.connect(admin).multicall([call_1,call_2]);
    // console.log('tx',tx);

    const MultiDelegateCallSampleABI = require("../abi/MultiDelegateCallSample.json").abi;
    const multiDelegateCall = new ethers.Contract(
        multicallAddress,
        MultiDelegateCallSampleABI,
        ethers.provider
    );

    //console.log('multiDelegateCall',multiDelegateCall);
    // let tx = await multiDelegateCall.connect(admin)['multicall((address,bytes)[])'](
    //   [['0x9aCb022B3A8a334618f5cea15A046C10FEE1352f','0x1e83409a000000000000000000000000a0045525f5fd55c7f8b87ae91fef98881edf1487']],
    //   {gasLimit: gasLimit});

    /*
    let tx = await multiDelegateCall.connect(admin)['multicall((address,uint256,bytes)[])'](
      [[populateTransaction2.to,20000000,populateTransaction2.data]],
      {gasLimit: 20000000});

    let receipt = await tx.wait();
    console.log('receipt ',receipt);

    for(let i=0; i< receipt.events.length; i++){
        let event = receipt.events[i];
        console.log(i, event);
    }
    */

    let tx = await multiDelegateCall.connect(admin)['claim(address,uint256,address)'](
      populateTransaction2.to,
      gasLimit,
      erc20Token2Address,
      {gasLimit: gasLimit}
    );

    let receipt = await tx.wait();
    console.log('receipt ',receipt);

    for(let i=0; i< receipt.events.length; i++){
        let event = receipt.events[i];
        console.log(i, event);
    }

  })


task("multi-delegatecall-test", "execute claim using multi-call")
  .addParam("multiDelegateCallAddress", "multiDelegatecallAddress")
  .addParam("helloAddress", "hello Address")
  .setAction(async ({ multiDelegateCallAddress, helloAddress}) => {
      console.log('multiDelegateCallAddress', multiDelegateCallAddress);
      console.log('helloAddress', helloAddress);
      const [admin] = await ethers.getSigners();

      const MultiDelegateCallSampleABI = require("../abi/MultiDelegateCallSample.json").abi;
      const multiDelegateCallSample = new ethers.Contract(
        multiDelegateCallAddress,
        MultiDelegateCallSampleABI,
        ethers.provider
      );
      const HelloABI = require("../abi/Hello.json").abi;
      const hello = new ethers.Contract(
        helloAddress,
        HelloABI,
        ethers.provider
      );


      let populateTransaction = await hello.populateTransaction.hello();

      console.log('populateTransaction ',populateTransaction);
      let tx =  await  multiDelegateCallSample.connect(admin).callFunction(populateTransaction.to, populateTransaction.data);
      let receipt = await tx.wait();
      console.log('receipt ',receipt);


      for(let i=0; i< receipt.events.length; i++){
          let event = receipt.events[i];
          console.log(i, event);

      }
  })

