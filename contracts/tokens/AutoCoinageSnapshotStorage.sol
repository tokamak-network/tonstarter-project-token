// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Arrays.sol";

contract AutoCoinageSnapshotStorage is AccessControl {
    using Arrays for uint256[];
    using Counters for Counters.Counter;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPDATE_ROLE = keccak256("UPDATE_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

    struct Layer2Snapshots {
        address[] layer2s;
        uint256[] snapshotIds;
    }

    struct BalanceSnapshots {
        uint256[] ids;
        uint256[] balances;
        uint256[] refactoredCounts;
        uint256[] remains;
    }

    struct FactorSnapshots {
        uint256[] ids;
        uint256[] factors;
        uint256[] refactorCounts;
    }

    uint256 public REFACTOR_BOUNDARY = 10 ** 28;
    uint256 public REFACTOR_DIVIDER = 2;

    address public seigManager ;
    address public layer2Lagistry ;

    // layer2- account - balance
    mapping(address => mapping (address => BalanceSnapshots)) internal accountBalanceSnapshots;

    // layer2- totalSupply
    mapping(address => BalanceSnapshots) internal totalSupplySnapshots;


    //layer2- factor
    mapping(address => FactorSnapshots) internal factorSnapshots;


    // layer2 ->currentLayer2SnapshotId
    mapping(address => uint256)  public currentLayer2SnapshotId;

    // layer2 ->currentAccountSnapshotId
    //mapping(address => mapping (address => BalanceSnapshots))  public currentAccountSnapshotId;

    //layer2 -> snapshot -> blockNumber
    mapping(address => mapping( uint256 => uint256))  internal blockNumberBySnapshotId;

    //snashotAggregatorId ->
    mapping(uint256 => Layer2Snapshots)  internal snashotAggregator;
    uint256 public snashotAggregatorTotal;

    bool public pauseProxy;
    bool public migratedL2;


    mapping(address => uint256) internal _balances;

    mapping(address => mapping(address => uint256)) internal _allowances;

    uint256 internal _totalSupply;

    string public name;
    string public symbol;
    uint256 public decimals;

}
