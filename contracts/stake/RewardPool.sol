// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import '@openzeppelin/contracts/utils/math/Math.sol';
// import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "hardhat/console.sol";

contract RewardPool is AccessControl {
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

    struct StakeInfo{
        uint256 amount;
        uint256 since;
        uint256 debtReward;
        uint256 lastClaimedTime;
        uint256 claimedAmount;
    }

    address public stakeToken;
    mapping(address => StakeInfo) public stakedInfo;

    uint256 public totalAllocatedReward ;
    uint256 public start ;
    uint256 public end ;
    uint256 public rewardPerSecond;
    uint256 public rewardPerStakeAmount;
    uint256 public lastUpdateTime;
    uint256 public totalStakedAmount ;
    uint256 constant DIV_CORRECTION = 10e18;

    modifier nonZeroAddress(address addr) {
        require(addr != address(0), 'address is zero');
        _;
    }

    modifier nonZero(uint256 val) {
        require(val > 0 , 'zero vaule');
        _;
    }

    event Claimed(address indexed from, uint256 amount);
    event Withdrawal(address indexed from, uint256 amount);

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

    function setInit(uint256 _start, uint256 _end, uint256 _totalAllocatedReward)
        external nonZero(_start) nonZero(_end) nonZero(_totalAllocatedReward)
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        require(start == 0, 'already setInit');
        require(_start > block.timestamp, 'start has passed');
        require(_start < _end, 'start >= _end');
        require(IERC20(stakeToken).balanceOf(address(this)) >= _totalAllocatedReward, 'balance is insufficient');

        start = _start;
        end = _end;
        totalAllocatedReward = _totalAllocatedReward;
        rewardPerSecond = _totalAllocatedReward/(end-start);
    }

    function stake(uint256 amount) public {

        IERC20(stakeToken).transferFrom(msg.sender, address(this), amount);
        _stake(msg.sender, amount);
    }

    function _stake(address sender, uint256 amount)
        internal
    {
        require(start < block.timestamp, 'not yet started');
        require(end > block.timestamp, 'already closed');
        updateReward();
        totalStakedAmount += amount;

        StakeInfo storage stakeInfo = stakedInfo[sender];
        stakeInfo.amount += amount;
        stakeInfo.debtReward += (rewardPerStakeAmount * amount);
        if(stakeInfo.since == 0 ) stakeInfo.since = block.timestamp;
    }

    function getRewardAmount(address sender) public view returns (uint256)
    {
        // console.log('getRewardAmount sender %s', sender);
        // console.log('getRewardAmount start %s', start);
        // console.log('getRewardAmount block.timestamp %s', block.timestamp);

        if(block.timestamp < start) return 0;
        uint256 period =  Math.min(block.timestamp, end) - start;
        //console.log('getRewardAmount period %s', period);


        StakeInfo storage stakeInfo = stakedInfo[sender];
        //console.log('getRewardAmount stakeInfo.amount %s', stakeInfo.amount);

        if(stakeInfo.amount > 0 ){

            uint256 mod1 = DIV_CORRECTION * rewardPerSecond / totalStakedAmount;
            mod1 = mod1 * period * stakeInfo.amount;
            mod1 = mod1/DIV_CORRECTION;
            //console.log('getRewardAmount mod1 %s', mod1);

            return ( mod1 - stakeInfo.debtReward - stakeInfo.claimedAmount);
        } else {
            return 0;
        }
    }

    function claim() public {
        updateReward();
        uint256 reward = getRewardAmount(msg.sender);
        require(reward > 0, "reward is zero");
         _claim(reward);
        emit Claimed(msg.sender, reward);
    }

    function _claim(uint256 reward) internal {
        StakeInfo storage stakeInfo = stakedInfo[msg.sender];
        stakeInfo.claimedAmount += reward;
        stakeInfo.lastClaimedTime = block.timestamp;

        IERC20(stakeToken).transfer(msg.sender, reward);
    }

    function withdraw() public {
        updateReward();
        uint256 reward = getRewardAmount(msg.sender);

        StakeInfo storage stakeInfo = stakedInfo[msg.sender];
        require(stakeInfo.amount > 0, "not staked");

        uint256 amount = stakeInfo.amount + reward;

        delete stakedInfo[msg.sender];

        IERC20(stakeToken).transfer(msg.sender, amount);
        emit Withdrawal(msg.sender, amount);
    }

    function getLastUpdateTime()
        public view returns (uint256)
    {
        // console.log('getLastUpdateTime start %s', start);
        // console.log('getLastUpdateTime lastUpdateTime %s', lastUpdateTime);
        // console.log('getLastUpdateTime block.timestamp %s', block.timestamp);

        if(start < block.timestamp) {
            return Math.min(Math.max(start, lastUpdateTime), end);
        } else {
           return 0;
        }

    }

    function getPeriodForUpdateReward()
        public view returns (uint256)
    {
        uint256 lastTime = getLastUpdateTime();
        // console.log('getPeriodForUpdateReward lastTime %s', lastTime);
        // console.log('getPeriodForUpdateReward block.timestamp %s', block.timestamp);
        // console.log('getPeriodForUpdateReward end %s', end);

        if(lastTime > 0 && block.timestamp < end) {
            return (block.timestamp - lastTime);
        } else if (lastTime >= end) {
            return 0;
        }

    }

    function updateReward()
        public
    {
        if(lastUpdateTime < block.timestamp ) {
            uint256 period = getPeriodForUpdateReward();
            if(period > 0 && totalStakedAmount > 0 ){
                uint256 mod1 = DIV_CORRECTION * rewardPerSecond / totalStakedAmount;
                mod1 = mod1 * period ;
                mod1 = mod1/DIV_CORRECTION;
                rewardPerStakeAmount += mod1;
                lastUpdateTime = block.timestamp;
            }
        }
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

