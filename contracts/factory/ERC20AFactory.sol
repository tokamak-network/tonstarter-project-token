// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IERC20Factory.sol";
import {ERC20A} from "../tokens/ERC20A.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/// @title A factory that creates a ERC20AFactory
contract ERC20AFactory is AccessControl, IERC20Factory {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    //bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    event CreatedERC20A(address contractAddress, string name, string symbol);

    struct ContractInfo {
        address contractAddress;
        string name;
        string symbol;
    }

    /// @dev Total number of contracts created
    uint256 public totalCreatedContracts ;

    /// @dev Contract information by index
    mapping(uint256 => ContractInfo) public createdContracts;

    /// @dev constructor of ERC20AFactory
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);

        totalCreatedContracts = 0;
    }

    /// @inheritdoc IERC20Factory
    function create(
        string calldata name,
        string calldata symbol,
        uint256 initialSupply,
        address owner
    ) external override returns (address) {
        require(owner != address(0),"owner is zero");
        require(bytes(name).length > 0,"name is empty");
        require(bytes(symbol).length > 0,"symbol is empty");

        ERC20A token = new ERC20A(name, symbol);

        require(
            address(token) != address(0),
            "token zero"
        );

        if(initialSupply > 0) token.mint(owner, initialSupply);
        token.addOwner(owner);

        token.renounceRole(SNAPSHOT_ROLE, address(this));
        token.renounceRole(MINTER_ROLE, address(this));
        token.renounceRole(DEFAULT_ADMIN_ROLE, address(this));

        createdContracts[totalCreatedContracts] = ContractInfo(address(token), name, symbol);
        totalCreatedContracts++;

        emit CreatedERC20A(address(token), name, symbol);

        return address(token);
    }

    /// @inheritdoc IERC20Factory
    function lastestCreated() external view override returns (address contractAddress, string memory name, string memory symbol){
        if(totalCreatedContracts > 0){
            return (createdContracts[totalCreatedContracts-1].contractAddress, createdContracts[totalCreatedContracts-1].name, createdContracts[totalCreatedContracts-1].symbol );
        }else {
            return (address(0), '', '');
        }
    }

    /// @inheritdoc IERC20Factory
    function getContracts(uint256 _index) external view override returns (address contractAddress, string memory name, string memory symbol){
        if(_index < totalCreatedContracts){
            return (createdContracts[_index].contractAddress, createdContracts[_index].name, createdContracts[_index].symbol);
        }else {
            return (address(0), '', '');
        }
    }

}
