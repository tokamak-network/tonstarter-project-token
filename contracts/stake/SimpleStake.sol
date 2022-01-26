// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

// import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "hardhat/console.sol";

contract SimpleStake is AccessControl {
    bytes4 constant ERC20_RECEIVED = 0x4fc35859;
    bytes4 constant ERC20_ONAPPROVE = 0x4273ca16;
     // As per the EIP-165 spec, no interface should ever match 0xffffffff
    bytes4 private constant InterfaceId_Invalid = 0xffffffff;

    bytes4 private constant InterfaceId_ERC165 = 0x01ffc9a7;
    /**
    * 0x01ffc9a7 ===
    *   bytes4(keccak256('supportsInterface(bytes4)'))
    */

    mapping(bytes4 => bool) private _supportedInterfaces;


    address public stakeToken;
    mapping(address => uint256) public stakeAmounts;
    uint256 public totalStakedAmount ;

    /**
    * @dev Magic value to be returned upon successful reception of an NFT
    *  Equals to `bytes4(keccak256("onERC20Received(address,address,uint256,bytes)"))`,
    *  which can be also obtained as `ERC20Receiver(0).onERC20Received.selector`
    */
   // bytes4 constant ERC20_RECEIVED = 0x4fc35859;

    constructor(
        address _stakeToken
    ){
        require(_stakeToken!=address(0),"_stakeToken is zero");
        stakeToken = _stakeToken;

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _registerInterface(ERC20_RECEIVED);
        _registerInterface(ERC20_ONAPPROVE);
        _registerInterface(InterfaceId_ERC165);

    }


    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return _supportedInterfaces[interfaceId];
    }

    function _registerInterface(bytes4 interfaceId) internal virtual {
        require(interfaceId != 0xffffffff, "ERC165: invalid interface id");
        _supportedInterfaces[interfaceId] = true;
    }

    function stake(uint256 amount) public {
        uint256 allowance = IERC20(stakeToken).allowance(msg.sender, address(this));

        IERC20(stakeToken).transferFrom(msg.sender, address(this), amount);
        _stake(msg.sender, amount);
    }

    function _stake(address sender, uint256 amount)
        internal
    {
        stakeAmounts[sender] += amount;
        totalStakedAmount += amount;
    }

    function withdraw() public {

        uint256 amount = stakeAmounts[msg.sender];

        require(amount > 0, "stakeAmount is zero");

        stakeAmounts[msg.sender] -= amount;
        totalStakedAmount -= amount;

        IERC20(stakeToken).transfer(msg.sender, amount);
    }

    function claim(uint256 amount) public onlyRole(DEFAULT_ADMIN_ROLE){
        require( (amount+totalStakedAmount) <= IERC20(stakeToken).balanceOf(address(this)), "balanceOf is unsufficient");

        IERC20(stakeToken).transfer(msg.sender, amount);
    }

    function onERC20Received(address from, address sender, uint256 amount, bytes calldata data) external returns (bytes4){

        require(msg.sender == stakeToken, "token is not stakeToken");
        _stake(from, amount);

        return this.onERC20Received.selector;
    }

    function onApprove(
        address owner,
        address spender,
        uint256 amount,
        bytes calldata data
    ) external returns (bool) {
        (address _spender, uint256 _amount) = _decodeData(data);
        require(
            amount == _amount && spender == _spender && spender == address(this),
            "amount != amountInData "
        );

        IERC20(stakeToken).transferFrom(owner, spender, amount);

        _stake(owner, _amount);
        return true;
    }

    function _decodeData(bytes calldata input)
        internal
        pure
        returns (address spender, uint256 amount)
    {
        (spender, amount) = abi.decode(input, (address, uint256));
    }

}

