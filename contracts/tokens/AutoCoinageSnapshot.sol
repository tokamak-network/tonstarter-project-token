// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "../libraries/SArrays.sol";

import "../powerton/AutoRefactorCoinageI.sol";
import "../powerton/SeigManagerI.sol";
import "../powerton/Layer2RegistryI.sol";

// import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "./AutoCoinageSnapshotStorage.sol";
// import "hardhat/console.sol";

import { DSMath } from "../libraries/DSMath.sol";

contract AutoCoinageSnapshot is AutoCoinageSnapshotStorage, DSMath {
    using SArrays for uint256[];
    using Counters for Counters.Counter;


    event onSnapshot(address indexed layer2, uint256 id);
    event onSyncLayer2(address indexed layer2, uint256 id);
    event onSyncLayer2Address(address indexed layer2, address account, uint256 id);
    event onSyncLayer2Batch(address indexed layer2, uint256 id);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(ADMIN_ROLE, msg.sender);
        _setupRole(UPDATE_ROLE, msg.sender);
        _setupRole(SNAPSHOT_ROLE, msg.sender);
    }

    function setAddress(address _seigManager, address _layer2Lagistry) external onlyRole(ADMIN_ROLE) {
        require(_seigManager != address(0) && _layer2Lagistry != address(0) , "zero address");
        seigManager = _seigManager;
        layer2Lagistry = _layer2Lagistry;
    }

    function setNameSymbolDecimals(string memory name_, string memory symbol_, uint256 decimals_) external onlyRole(ADMIN_ROLE) {
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
    }

    function _factorAt(address layer2, uint256 snapshotId) internal view virtual returns (bool, uint256, uint256) {

        FactorSnapshots storage snapshots = factorSnapshots[layer2];

        if(snapshotId > 0 && snapshotId <= getCurrentLayer2SnapshotId(layer2) ) {
            uint256 index = snapshots.ids.findIndex(snapshotId);

            if (index == snapshots.ids.length) {
                return (false, 0, 0);
            } else {
                return (true, snapshots.factors[index], snapshots.refactorCounts[index]);
            }
        } else {
            return (false, 0, 0);
        }

    }

    function _valueAt(address layer2, uint256 snapshotId, BalanceSnapshots storage snapshots) internal view
        returns (bool, uint256, uint256, uint256)
    {

        if(snapshotId > 0 && snapshotId <= getCurrentLayer2SnapshotId(layer2) ) {
            uint256 index = snapshots.ids.findIndex(snapshotId);
            if (index == snapshots.ids.length) {
                // return (false, 0, 0, 0);
                if(index > 0 ){
                    return (true, snapshots.balances[index-1], snapshots.refactoredCounts[index-1], snapshots.remains[index-1]);
                } else {
                    return (false, 0, 0, 0);
                }
            } else {
                return (true, snapshots.balances[index], snapshots.refactoredCounts[index], snapshots.remains[index]);
            }
        } else {

            return (false, 0, 0, 0);
        }

    }

    function _balanceOfAt(address layer2, address account, uint256 snapshotId)
        internal view virtual
        returns (bool, uint256, uint256, uint256)
    {

        (bool snapshotted, uint256 balances, uint256 refactoredCounts, uint256 remains) = _valueAt(layer2, snapshotId, accountBalanceSnapshots[layer2][account]);

        return (snapshotted, balances, refactoredCounts, remains);
        //return snapshotted ? value : balanceOf(account);
    }

    function _totalSupplyAt(address layer2, uint256 snapshotId)
        internal view virtual
        returns (bool, uint256, uint256, uint256)
    {
        (bool snapshotted, uint256 balances, uint256 refactoredCounts, uint256 remains)  = _valueAt(layer2, snapshotId, totalSupplySnapshots[layer2]);

        return (snapshotted, balances, refactoredCounts, remains);
        //return snapshotted ? value : totalSupply();
    }

    function applyFactor(uint256 v, uint256 refactoredCount, uint256 _factor, uint256 refactorCount) public view returns (uint256)
    {
        if (v == 0) {
            return 0;
        }

        v = rmul2(v, _factor);

        for (uint256 i = refactoredCount; i < refactorCount; i++) {
            v = v * REFACTOR_DIVIDER ;
        }

        return v;
    }


    function _snapshot(address layer2) internal virtual returns (uint256) {
        currentLayer2SnapshotId[layer2]++;
        blockNumberBySnapshotId[layer2][currentLayer2SnapshotId[layer2]] = block.number;

        uint256 currentId = getCurrentLayer2SnapshotId(layer2);
        emit onSnapshot(layer2, currentId);
        return currentId;

    }


    function _lastSnapshotId(uint256[] storage ids) internal view returns (uint256) {
        if (ids.length == 0) {
            return 0;
        } else {
            return ids[ids.length - 1];
        }
    }

    function _updateBalanceSnapshots(
            address layer2,
            BalanceSnapshots storage snapshots,
            uint256 balances,
            uint256 refactoredCounts,
            uint256 remains
    ) internal  {

        uint256 currentId = getCurrentLayer2SnapshotId(layer2);

        uint256 index = _lastSnapshotId(snapshots.ids);

        if (index < currentId) {
            snapshots.ids.push(currentId);
            snapshots.balances.push(balances);
            snapshots.refactoredCounts.push(refactoredCounts);
            snapshots.remains.push(remains);
        }
    }

    function _updateFactorSnapshots(
        address layer2,
        FactorSnapshots storage snapshots,
        uint256 factors,
        uint256 refactorCounts
    ) internal {

        uint256 currentId = getCurrentLayer2SnapshotId(layer2);

        if (_lastSnapshotId(snapshots.ids) < currentId) {
            snapshots.ids.push(currentId);
            snapshots.factors.push(factors);
            snapshots.refactorCounts.push(refactorCounts);
        }
    }

    function updateLayer2Account(address layer2, address account, uint256 balances, uint256 refactoredCounts, uint256 remains) internal {

        _updateBalanceSnapshots(
            layer2,
            accountBalanceSnapshots[layer2][account],
            balances,
            refactoredCounts,
            remains
            );
    }


    function updateLayer2TotalSupply(address layer2, uint256 balances, uint256 refactoredCounts, uint256 remains) internal {

        _updateBalanceSnapshots(
            layer2,
            totalSupplySnapshots[layer2],
            balances,
            refactoredCounts,
            remains
            );
    }

    function updateLayer2Factor(address layer2, uint256 factor, uint256 refactorCount) internal {

        _updateFactorSnapshots(
            layer2,
            factorSnapshots[layer2],
            factor,
            refactorCount
        );
    }

    //function onSnapshotAggregator() public onlyRole(SNAPSHOT_ROLE) returns (uint256) {
    function snapshot() public returns (uint256) {
        snashotAggregatorTotal++;

        uint256 numberOfLayer2s = Layer2RegistryI(layer2Lagistry).numLayer2s();

        for (uint256 i = 0; i < numberOfLayer2s; i++) {
            address layer2 = Layer2RegistryI(layer2Lagistry).layer2ByIndex(i);
            if(SeigManagerI(seigManager).coinages(layer2) != address(0)){

                Layer2Snapshots storage snapshot_ = snashotAggregator[snashotAggregatorTotal];
                snapshot_.layer2s.push(layer2);
                snapshot_.snapshotIds.push(getCurrentLayer2SnapshotId(layer2));
            }
        }
        return snashotAggregatorTotal;
    }

    function snapshot(address layer2) public onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot(layer2);
    }

    function sync(address layer2) public returns (uint256){

        address coinage  = SeigManagerI(seigManager).coinages(layer2);
        require(coinage != address(0), "zero coinages");

        AutoRefactorCoinageI.Balance memory totalBalance  = AutoRefactorCoinageI(coinage)._totalSupply();
        uint256 tbalances = totalBalance.balance;
        uint256 trefactoredCounts = totalBalance.refactoredCount;
        uint256 tremains = totalBalance.remain;

        uint256 _factor  = AutoRefactorCoinageI(coinage)._factor();
        uint256 refactorCount  = AutoRefactorCoinageI(coinage).refactorCount();

        if(!existLayer2s[layer2]) {
            existLayer2s[layer2] = true;
            layer2s.push(layer2);
        }

        uint256 snapshotId = _snapshot(layer2);
        updateLayer2TotalSupply(layer2, tbalances, trefactoredCounts, tremains);
        updateLayer2Factor(layer2, _factor, refactorCount);

        emit onSyncLayer2(layer2, snapshotId);
        return snapshotId;
    }


    function sync(address layer2, address account) public returns (uint256) {

        address coinage  = SeigManagerI(seigManager).coinages(layer2);
        require(coinage != address(0), "zero coinages");
        require(account != address(0), "zero account");

        AutoRefactorCoinageI.Balance memory accountBalance  = AutoRefactorCoinageI(coinage).balances(account);
        uint256 balances = accountBalance.balance;
        uint256 refactoredCounts = accountBalance.refactoredCount;
        uint256 remains = accountBalance.remain;

        AutoRefactorCoinageI.Balance memory totalBalance  = AutoRefactorCoinageI(coinage)._totalSupply();
        uint256 tbalances = totalBalance.balance;
        uint256 trefactoredCounts = totalBalance.refactoredCount;
        uint256 tremains = totalBalance.remain;

        uint256 _factor  = AutoRefactorCoinageI(coinage)._factor();
        uint256 refactorCount  = AutoRefactorCoinageI(coinage).refactorCount();

        uint256 snapshotId = _snapshot(layer2);
        updateLayer2Account(layer2, account, balances, refactoredCounts, remains);
        updateLayer2TotalSupply(layer2, tbalances, trefactoredCounts, tremains);
        updateLayer2Factor(layer2, _factor, refactorCount);

        address layer2_ = layer2;
        if(!existLayer2s[layer2_]) {
            existLayer2s[layer2_] = true;
            layer2s.push(layer2_);
        }
        address account_ = account;
        if(!existAccounts[account_]) {
            existAccounts[account_] = true;
            uniqAccounts.push(account_);
        }

        emit onSyncLayer2Address(layer2_, account_, snapshotId);
        return snapshotId;
    }

    function syncBatch(
        address layer2,
        address[] memory accounts
        )
        external returns (uint256)
    {
        address coinage  = SeigManagerI(seigManager).coinages(layer2);
        require(coinage != address(0), "zero coinages");
        require(accounts.length > 0, "zero accounts");

        uint256 snapshotId = _snapshot(layer2);

        for (uint256 i = 0; i < accounts.length; ++i) {
            //console.log('syncBatch ',layer2, accounts[i]);
            AutoRefactorCoinageI.Balance memory accountBalance  = AutoRefactorCoinageI(coinage).balances(accounts[i]);
            updateLayer2Account(layer2, accounts[i], accountBalance.balance, accountBalance.refactoredCount, accountBalance.remain);

            if(!existAccounts[accounts[i]]) {
                existAccounts[accounts[i]] = true;
                uniqAccounts.push(accounts[i]);
            }
        }

        AutoRefactorCoinageI.Balance memory totalBalance  = AutoRefactorCoinageI(coinage)._totalSupply();
        uint256 tbalances = totalBalance.balance;
        uint256 trefactoredCounts = totalBalance.refactoredCount;
        uint256 tremains = totalBalance.remain;

        uint256 _factor  = AutoRefactorCoinageI(coinage)._factor();
        uint256 refactorCount  = AutoRefactorCoinageI(coinage).refactorCount();

         if(!existLayer2s[layer2]) {
            existLayer2s[layer2] = true;
            layer2s.push(layer2);
        }
        updateLayer2TotalSupply(layer2, tbalances, trefactoredCounts, tremains);
        updateLayer2Factor(layer2, _factor, refactorCount);

        emit onSyncLayer2Batch(layer2, snapshotId);
        return snapshotId;
    }
    /*
    function syncBactchOffline(
        address layer2,
        address[] memory accounts,
        uint256[] memory balances,
        uint256[] memory refactoredCounts,
        uint256[] memory remains,
        uint256[3] memory layerTotal,
        uint256[2] memory layerFactor
        )
        external onlyRole(UPDATE_ROLE)  returns (bool)
    {
        require(accounts.length == balances.length, "No balances same length");
        require(accounts.length == refactoredCounts.length, "No refactoredCounts same length");
        require(accounts.length == remains.length, "No remains same length");
        snapshot(layer2);
        for (uint256 i = 0; i < accounts.length; ++i) {
            updateLayer2Account(
                layer2,
                accounts[i],
                balances[i],
                refactoredCounts[i],
                remains[i]
                );
        }

        updateLayer2TotalSupply(layer2, layerTotal[0], layerTotal[1], layerTotal[2]);
        updateLayer2Factor(layer2, layerFactor[0], layerFactor[1]);

        return true;
    }
    */

    function getLayer2TotalSupplyInTokamak(address layer2) public view
        returns (
                uint256 totalSupplyLayer2,
                uint256 balance,
                uint256 refactoredCount,
                uint256 remain
        )
    {
        address coinage  = SeigManagerI(seigManager).coinages(layer2);
        require(coinage != address(0), "zero coinages");

        totalSupplyLayer2 = AutoRefactorCoinageI(coinage).totalSupply();
        AutoRefactorCoinageI.Balance memory totalBalance  = AutoRefactorCoinageI(coinage)._totalSupply();

        balance = totalBalance.balance;
        refactoredCount = totalBalance.refactoredCount;
        remain = totalBalance.remain;
    }

    function getLayer2BalanceOfInTokamak(address layer2, address user) public view
        returns (
                uint256 balanceOfLayer2Amount,
                uint256 balance,
                uint256 refactoredCount,
                uint256 remain
        )
    {
        address coinage  = SeigManagerI(seigManager).coinages(layer2);
        require(coinage != address(0), "zero coinages");

        balanceOfLayer2Amount = AutoRefactorCoinageI(coinage).balanceOf(user);


        AutoRefactorCoinageI.Balance memory totalBalance  = AutoRefactorCoinageI(coinage).balances(user);


        balance = totalBalance.balance;
        refactoredCount = totalBalance.refactoredCount;
        remain = totalBalance.remain;
    }

    function getBalanceOfInTokamak(address account) public view
        returns (
                uint256 accountAmount
        )
    {
        uint256 numberOfLayer2s = Layer2RegistryI(layer2Lagistry).numLayer2s();
        accountAmount = 0;
        for (uint256 i = 0; i < numberOfLayer2s; i++) {
            address layer2 = Layer2RegistryI(layer2Lagistry).layer2ByIndex(i);
            address coinage  = SeigManagerI(seigManager).coinages(layer2);
            if(coinage != address(0)){
                accountAmount += AutoRefactorCoinageI(coinage).balanceOf(account);
            }
        }
    }

    function getTotalStakedInTokamak() public view
        returns (
                uint256 accountAmount
        )
    {
        uint256 numberOfLayer2s = Layer2RegistryI(layer2Lagistry).numLayer2s();
        accountAmount = 0;
        for (uint256 i = 0; i < numberOfLayer2s; i++) {
            address layer2 = Layer2RegistryI(layer2Lagistry).layer2ByIndex(i);
            address coinage  = SeigManagerI(seigManager).coinages(layer2);
            if(coinage != address(0)){
                accountAmount += AutoRefactorCoinageI(coinage).totalSupply();
            }
        }
    }


    function currentAccountBalanceSnapshots(address layer2, address account) public view
        returns (
                bool snapshotted,
                uint256 snapShotBalance,
                uint256 snapShotRefactoredCount,
                uint256 snapShotRemain,
                uint256 currentBalanceOf,
                uint256 curBalances,
                uint256 curRefactoredCounts,
                uint256 curRemains
        )
    {
        address coinage  = SeigManagerI(seigManager).coinages(layer2);
        require(coinage != address(0), "zero coinages");

        currentBalanceOf = AutoRefactorCoinageI(coinage).balanceOf(account);

        AutoRefactorCoinageI.Balance memory accountBalance  = AutoRefactorCoinageI(coinage).balances(account);
        curBalances = accountBalance.balance;
        curRefactoredCounts = accountBalance.refactoredCount;
        curRemains = accountBalance.remain;

        uint256 currentId = getCurrentLayer2SnapshotId(layer2);

        BalanceSnapshots storage snapshots = accountBalanceSnapshots[layer2][account];
        (snapshotted, snapShotBalance, snapShotRefactoredCount, snapShotRemain) = _valueAt(layer2, currentId, snapshots);
    }

    function currentTotalSupplySnapshots(address layer2) public view
        returns (
                bool snapshotted,
                uint256 snapShotBalance,
                uint256 snapShotRefactoredCount,
                uint256 snapShotRemain,
                uint256 currentTotalSupply,
                uint256 curBalances,
                uint256 curRefactoredCounts,
                uint256 curRemains
        )
    {
        address coinage  = SeigManagerI(seigManager).coinages(layer2);
        require(coinage != address(0), "zero coinages");

        currentTotalSupply = AutoRefactorCoinageI(coinage).totalSupply();
        AutoRefactorCoinageI.Balance memory totalBalance  = AutoRefactorCoinageI(coinage)._totalSupply();
        curBalances = totalBalance.balance;
        curRefactoredCounts = totalBalance.refactoredCount;
        curRemains = totalBalance.remain;

        uint256 currentId = getCurrentLayer2SnapshotId(layer2);
        BalanceSnapshots storage snapshots = totalSupplySnapshots[layer2];
        (snapshotted, snapShotBalance, snapShotRefactoredCount, snapShotRemain) = _valueAt(layer2, currentId, snapshots);
    }

    function currentFactorSnapshots(address layer2) public view
        returns (
                bool snapshotted,
                uint256 snapShotFactor,
                uint256 snapShotRefactorCount,
                uint256 curFactorValue,
                uint256 curFactor,
                uint256 curRefactorCount
        )
    {
        address coinage  = SeigManagerI(seigManager).coinages(layer2);
        require(coinage != address(0), "zero coinages");

        curFactorValue = AutoRefactorCoinageI(coinage).factor();
        curFactor  = AutoRefactorCoinageI(coinage)._factor();
        curRefactorCount  = AutoRefactorCoinageI(coinage).refactorCount();

        uint256 currentId = getCurrentLayer2SnapshotId(layer2);

        (snapshotted, snapShotFactor, snapShotRefactorCount)
            = _factorAt(layer2, currentId );

    }

    function getCurrentLayer2SnapshotId(address layer2) public view returns (uint256) {
        return currentLayer2SnapshotId[layer2];
    }

    function balanceOf(address account) public view  returns (uint256)
    {
        uint256 numberOfLayer2s = Layer2RegistryI(layer2Lagistry).numLayer2s();
        uint256 accountAmount = 0;
        for (uint256 i = 0; i < numberOfLayer2s; i++) {
            address layer2 = Layer2RegistryI(layer2Lagistry).layer2ByIndex(i);
            address coinage  = SeigManagerI(seigManager).coinages(layer2);
            if(coinage != address(0)){
                accountAmount += balanceOf(layer2, account);
            }
        }
        //console.log("balanceOf(account) %s", accountAmount);
        return accountAmount;
    }

    function totalSupply() public view returns (uint256)
    {
        uint256 numberOfLayer2s = Layer2RegistryI(layer2Lagistry).numLayer2s();
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < numberOfLayer2s; i++) {
            address layer2 = Layer2RegistryI(layer2Lagistry).layer2ByIndex(i);
            address coinage  = SeigManagerI(seigManager).coinages(layer2);
            if(coinage != address(0)){
                totalAmount += totalSupply(layer2);
            }
        }
        return totalAmount;
    }


    function balanceOf(address layer2, address account)
        public view returns (uint256)
    {
        return balanceOfAt(layer2, account, getCurrentLayer2SnapshotId(layer2));
    }


    function balanceOfAt(address layer2, address account, uint256 snapshotId)
        public view returns (uint256)
    {
        // console.log('balanceOfAt ===layer2 : %s %s %s ',layer2, account, snapshotId);
        if(snapshotId > 0){
            (bool snapshotted1, uint256 balances, uint256 refactoredCounts, uint256 remains) = _balanceOfAt(layer2, account, snapshotId);
            (bool snapshotted2, uint256 factors, uint256 refactorCounts) = _factorAt(layer2, snapshotId);

            // console.log('snapshotId %s', snapshotId);
            // console.log('snapshotted1 %s', snapshotted1);
            // console.log('balances %s', balances);
            // console.log('refactoredCounts %s', refactoredCounts);
            // console.log('remains %s', remains);
            // console.log('balanceOfAt end =================');
            if(snapshotted1 &&  snapshotted2) {
                uint256 bal = applyFactor(balances, refactoredCounts, factors, refactorCounts);
                bal += remains;

                // console.log('balanceOfAt : %s %s ',snapshotId, bal);
                return bal;
            } else {
                return 0;
            }
        } else {
            return 0;
        }
    }

    function balanceOfAt(address account, uint256 snashotAggregatorId)
        public view returns (uint256 accountStaked)
    {
        accountStaked = 0;
        if(snashotAggregatorId <= snashotAggregatorTotal){
            Layer2Snapshots memory snapshots = snashotAggregator[snashotAggregatorId];
            if(snapshots.layer2s.length == 0) return 0;
            for(uint256 i = 0; i< snapshots.layer2s.length; i++){
                accountStaked += balanceOfAt(snapshots.layer2s[i], account, snapshots.snapshotIds[i]);
            }
        }
    }



    function stakedAmountWithSnashotAggregator(address account, uint256 snashotAggregatorId)
        public view returns (uint256 accountStaked, uint256 totalStaked)
    {
        accountStaked = 0;
        totalStaked = 0;
        if(snashotAggregatorId <= snashotAggregatorTotal){
            Layer2Snapshots memory snapshots = snashotAggregator[snashotAggregatorId];
            if(snapshots.layer2s.length == 0) return (0, 0);
            for(uint256 i = 0; i< snapshots.layer2s.length; i++){
                accountStaked += balanceOfAt(snapshots.layer2s[i], account, snapshots.snapshotIds[i]);
                totalStaked += totalSupplyAt(snapshots.layer2s[i], snapshots.snapshotIds[i]);
            }
        }
    }

    function totalSupply(address layer2)
        public view returns (uint256)
    {
        return totalSupplyAt(layer2, getCurrentLayer2SnapshotId(layer2));
    }

    function totalSupplyAt(uint256 snashotAggregatorId)
        public view returns (uint256 totalStaked)
    {
        totalStaked = 0;
        if(snashotAggregatorId <= snashotAggregatorTotal){
            Layer2Snapshots memory snapshots = snashotAggregator[snashotAggregatorId];
            if(snapshots.layer2s.length == 0) return 0;
            for(uint256 i = 0; i< snapshots.layer2s.length; i++){
                totalStaked += totalSupplyAt(snapshots.layer2s[i], snapshots.snapshotIds[i]);
            }
        }
    }

    function totalSupplyAt(address layer2, uint256 snapshotId)
        public view returns (uint256)
    {
        if(snapshotId > 0){
            (bool snapshotted1, uint256 balances, uint256 refactoredCounts, uint256 remains) = _totalSupplyAt(layer2, snapshotId);
            (bool snapshotted2, uint256 factors, uint256 refactorCounts) = _factorAt(layer2, snapshotId);

            if(snapshotted1 &&  snapshotted2) {
                uint256 bal = applyFactor(balances, refactoredCounts, factors, refactorCounts);
                bal += remains;
                return bal;
            } else {
                return 0;
            }
        } else {
            return 0;
        }

    }

    function lastSnapShotIndex(address layer2) public view
        returns (uint256)
    {
        if(totalSupplySnapshots[layer2].ids.length == 0) return 0;
        return totalSupplySnapshots[layer2].ids.length-1;
    }


    function getAccountBalanceSnapsByIds(uint256 id, address layer2, address account) public view
        returns (uint256, uint256, uint256, uint256)
    {
        BalanceSnapshots memory snapshot_ =  accountBalanceSnapshots[layer2][account];
        uint256 len = snapshot_.ids.length;
        if(id >= len)
            return (snapshot_.ids[len], snapshot_.balances[len], snapshot_.refactoredCounts[len], snapshot_.remains[len]);
        return (snapshot_.ids[id], snapshot_.balances[id], snapshot_.refactoredCounts[id], snapshot_.remains[id]);
    }

    function getAccountBalanceSnapsBySnapshotId(uint256 snapshotId, address layer2, address account) public view
        returns (uint256, uint256, uint256, uint256)
    {
        BalanceSnapshots storage snapshot_ =  accountBalanceSnapshots[layer2][account];

        if(snapshot_.ids.length == 0) return (0,0,0,0);

        if(snapshotId > 0 && snapshotId <= getCurrentLayer2SnapshotId(layer2)) {
            uint256 id = snapshot_.ids.findIndex(snapshotId);
            // console.log('getAccountBalanceSnapsBySnapshotId findIndex %s', id);
            return (snapshot_.ids[id], snapshot_.balances[id], snapshot_.refactoredCounts[id], snapshot_.remains[id]);
        } else {
            return (0,0,0,0);
        }
    }


    function transfer(address recipient, uint256 amount) public virtual returns (bool) {
        return false;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual  returns (bool) {
        return false;
    }

    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return 0;
    }
    /*
    function allowance(address owner, address spender) public view virtual returns (uint256) {
        return 0;
    }

    function approve(address spender, uint256 amount) public virtual returns (bool) {
        return false;
    }

    function increaseAllowance(address spender, uint256 addedValue) public virtual  returns (bool) {
        return false;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual  returns (bool) {
        return false;
    }
    */
}




