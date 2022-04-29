// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAutoCoinageSnapshot2 {

    event Snapshot(uint256 snashotAggregatorId);
    event SnapshotLayer2(address indexed layer2, uint256 id);
    event SyncLayer2(address indexed layer2, uint256 id);
    event SyncLayer2Address(address indexed layer2, address account, uint256 id);
    event SyncLayer2Batch(address indexed layer2, uint256 id);
    event AddSync(address indexed layer2, address indexed account);


    // onlyRole(ADMIN_ROLE)
    function setAddress(address _seigManager, address _layer2Registry) external ;
    function setNameSymbolDecimals(string memory name_, string memory symbol_, uint256 decimals_) external ;
    function addLayer2s(address[] memory _layers) external ;
    function syncBactchOffline(
        address layer2,
        address[] memory accounts,
        uint256[] memory balances,
        uint256[] memory refactoredCounts,
        uint256[] memory remains,
        uint256[3] memory layerTotal,
        uint256[2] memory layerFactor
        )
        external returns (bool) ;


    // view
    function applyFactor(uint256 v, uint256 refactoredCount, uint256 _factor, uint256 refactorCount) external view returns (uint256);

    // can anybody
    function addSync(address layer2, address account) external returns (uint256);


    function snapshot() external returns (uint256);
    function snapshot(address layer2) external returns (uint256) ;

    function sync(address layer2) external returns (uint256);
    function sync(address layer2, address account) external returns (uint256);
    function syncBatch(address layer2,  address[] memory accounts) external returns (uint256);

    function layerSnapshotIds(uint256 snashotAggregatorId) external view returns (address[] memory, uint256[] memory) ;

    function getLayer2TotalSupplyInTokamak(address layer2) external view
        returns (
                uint256 totalSupplyLayer2,
                uint256 balance,
                uint256 refactoredCount,
                uint256 remain
        );

    function getLayer2BalanceOfInTokamak(address layer2, address user) external view
        returns (
                uint256 balanceOfLayer2Amount,
                uint256 balance,
                uint256 refactoredCount,
                uint256 remain
        );

    function getBalanceOfInTokamak(address account) external view
        returns (
                uint256 accountAmount
        );

    function getTotalStakedInTokamak() external view
        returns (
                uint256 accountAmount
        );

    function currentAccountBalanceSnapshots(address layer2, address account) external view
        returns (
                bool snapshotted,
                uint256 snapShotBalance,
                uint256 snapShotRefactoredCount,
                uint256 snapShotRemain,
                uint256 currentBalanceOf,
                uint256 curBalances,
                uint256 curRefactoredCounts,
                uint256 curRemains
        );

    function currentTotalSupplySnapshots(address layer2) external view
        returns (
                bool snapshotted,
                uint256 snapShotBalance,
                uint256 snapShotRefactoredCount,
                uint256 snapShotRemain,
                uint256 currentTotalSupply,
                uint256 curBalances,
                uint256 curRefactoredCounts,
                uint256 curRemains
        );

    function currentFactorSnapshots(address layer2) external view
        returns (
                bool snapshotted,
                uint256 snapShotFactor,
                uint256 snapShotRefactorCount,
                uint256 curFactorValue,
                uint256 curFactor,
                uint256 curRefactorCount
        );

    function getCurrentLayer2SnapshotId(address layer2) external view returns (uint256) ;

    function balanceOf(address account) external view returns (uint256);
    function totalSupply() external view returns (uint256);

    function balanceOf(address layer2, address account) external view returns (uint256);
    function balanceOfAt(address account, uint256 snashotAggregatorId) external view returns (uint256);
    function balanceOfAt(address layer2, address account, uint256 snapshotId) external view returns (uint256);
    function totalSupply(address layer2) external view returns (uint256);
    function totalSupplyAt(uint256 snashotAggregatorId) external view returns (uint256 totalStaked);
    function totalSupplyAt(address layer2, uint256 snapshotId) external view returns (uint256);
    function stakedAmountWithSnashotAggregator(address account, uint256 snashotAggregatorId) external view
        returns (uint256 accountStaked, uint256 totalStaked);

    function lastSnapShotIndex(address layer2) external view returns (uint256);

    function getAccountBalanceSnapsByIds(uint256 id, address layer2, address account) external view
        returns (uint256, uint256, uint256, uint256);


    function getAccountBalanceSnapsBySnapshotId(uint256 snapshotId, address layer2, address account) external view
        returns (uint256, uint256, uint256, uint256);

}
