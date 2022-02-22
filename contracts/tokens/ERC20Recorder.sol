// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Recorder is ERC20, ERC20Snapshot, AccessControl {
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    
    constructor(
        string memory _name,
        string memory _symbol,
        address _owner,
        address _depositManager
    ) ERC20(_name, _symbol) {
        _setupRole(DEFAULT_ADMIN_ROLE, _owner);
        _setupRole(SNAPSHOT_ROLE, _owner);
        _setupRole(MINTER_ROLE, _owner);

        _setupRole(MINTER_ROLE, _depositManager);
        _setupRole(BURNER_ROLE, _depositManager);
    }

    /**
     * @dev Overrides _beforeTokenTransfer
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }

    /**
     * @dev Mints `amount` tokens from the `account`.
     */
    function mintBatch(address[] memory accounts, uint256[] memory amounts)
        external
        onlyRole(MINTER_ROLE)
        returns (bool)
    {
        require(accounts.length == amounts.length, "No same length");
        for (uint256 i = 0; i < accounts.length; ++i) {
            _mint(accounts[i], amounts[i]);
        }
        return true;
    }

    /**
     * @dev Mints `amount` tokens from the `account`.
     */
    function mint(address account, uint256 amount)
        external
        onlyRole(MINTER_ROLE)
        returns (bool)
    {
        _mint(account,amount);
        return true;
    }

    /**
     * @dev Destroys `amount` tokens from the `account`.
     */
    function burnFrom(address account, uint256 amount)
        external
        onlyRole(BURNER_ROLE)
        returns (bool)
    {
        _burn(account, amount);
        return true;
    }

    /**
     * @dev Destroys `amount` tokens from the caller.
     *
     * See {ERC20-_burn}.
     */
    function burn(uint256 amount) public virtual {
        _burn(_msgSender(), amount);
    }

    /**
     * @dev Destroys `amount` tokens from the `account`.
     */
    function currentSnapshotId() public view returns (uint256) {
        return _getCurrentSnapshotId();
    }

    /**
     * @dev Destroys `amount` tokens from the `account`.
     */
    function snapshot() public onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        return false;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return 0;
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        return false;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) public virtual override returns (bool) {
        return false;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual override returns (bool) {
        return false;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual override returns (bool) {
        return false;
    }
}

