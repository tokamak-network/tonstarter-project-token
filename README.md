# tonstarter-project-token

# Deployed on Mainnet
* ERC20SimpleFactory : 0x230539fB72e7eeA8Bb037cA0556Fa9b0060A5d10
* ProjectToken : 0x76d3BD566B97f4D36C80717104A636339c6ce6FF
* ProjectTokenProxy : 0x96D366bBE6B83D895D2AFd0BC0139b9089486055
* ERC20SimpleFactory : 0x230539fB72e7eeA8Bb037cA0556Fa9b0060A5d10
* ProjectToken : 0x76d3BD566B97f4D36C80717104A636339c6ce6FF
* ProjectTokenProxy : 0x96D366bBE6B83D895D2AFd0BC0139b9089486055

# Contracts that can airdrop to TON Staker
* AutoCoinageSnapshot2 : 0x10f5f22D53415ba10F0E3b0fb0999B2928f20822
* AutoCoinageSnapshotProxy2 : 0x85Ca9f611C363065252EA9462c90743922767b55
* PowerTONSwapperImpl : 0x03140e1e254a4840C4983B20267A5c391e3Fdb19
* PowerTONSwapperProxy : 0x970298189050aBd4dc4F119ccae14ee145ad9371
* TokenDividendPool : 0x4EEd886B5D02C0a2aFbB297a285d23820f8015c2
* TokenDividendPoolProxy : 0x06245F89576536E9cF844C5804a8ad1CCeDb2642

AutoCoinageSnapshotProxy2
https://etherscan.io/address/0x85Ca9f611C363065252EA9462c90743922767b55#readProxyContract

### function snapshot() public returns (uint256)
With the returned ID (snashotAggregatorId), you can inquire the balance at a specific point in time.

### function balanceOfAt(address account, uint256 snashotAggregatorId) public view returns (uint256 accountStaked)
### function totalSupplyAt(uint256 snashotAggregatorId) public view returns (uint256 totalStaked)



# ERC20Simple Specs.

* ERC20
* ERC165
* EIP712
* BURNABLE ( only hasOwned )
* APPROVEANDCALL
* SNAPSHOT ( only hasSnapshotRole )
* PERMIT


# ERC20A Specs.

* ERC20
* ERC165
* EIP712
* MINTERBLE ( only hasMinterRole )
* BURNABLE ( only hasOwned )
* APPROVEANDCALL
* SNAPSHOT ( only hasSnapshotRole )
* PERMIT


# ERC20B Specs.

* ERC20
* ERC165
* MINTERBLE ( only hasMinterRole )
* BURNABLE ( only hasOwned )
* APPROVEANDCALL
* SNAPSHOT ( only hasSnapshotRole )


# ERC20C Specs.

* ERC20
* ERC165
* MINTERBLE ( only hasMinterRole )
* BURNABLE ( only hasOwned )
* APPROVEANDCALL


# compile
npx hardhat compile


# test
npx hardhat test
