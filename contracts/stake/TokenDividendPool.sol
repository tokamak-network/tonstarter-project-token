// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

import "../interfaces/ITokenDividendPool.sol";
import "../libraries/LibTokenDividendPool.sol";

import "../common/AccessibleCommon.sol";
import "./TokenDividendPoolStorage.sol";

import "../interfaces/IIERC20.sol";

contract TokenDividendPool is
    TokenDividendPoolStorage,
    AccessibleCommon,
    ITokenDividendPool
{
    event Claim(address indexed token, uint256 amount, uint256 snapshotId);
    event Distribute(address indexed token, uint256 amount);

    /// @dev Check if a function is used or not
    modifier ifFree {
        require(free == 1, "LockId is already in use");
        free = 0;
        _;
        free = 1;
    }

    /// @inheritdoc ITokenDividendPool
    function claim(address _token) public override {
        claimUpTo(
            _token,
            distributions[_token].snapshots.length
        );
    }

    /// @inheritdoc ITokenDividendPool
    function claimBatch(address[] calldata _tokens) external override {
        for (uint i = 0; i < _tokens.length; ++i) {
            claim(_tokens[i]);
        }
    }

    /// @inheritdoc ITokenDividendPool
    function claimUpTo(address _token, uint256 _endSnapshotIndex) public override {
        require(claimableForPeriod(_token, msg.sender, 0, _endSnapshotIndex) > 0, "Claimable amount is zero");
        _claimUpTo(_token, msg.sender, _endSnapshotIndex);
    }

    /// @inheritdoc ITokenDividendPool
    function distribute(address _token, uint256 _amount)
        external
        override
        ifFree
    {
        require(
            IIERC20(erc20DividendAddress).totalSupply() > 0,
            "Total Supply is zero"
        );

        LibTokenDividendPool.Distribution storage distr = distributions[_token];
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);
        if (distr.exists == false) {
            distributedTokens.push(_token);
        }

        uint256 newBalance = IERC20(_token).balanceOf(address(this));
        uint256 increment = newBalance - distr.lastBalance;
        distr.exists = true;
        distr.lastBalance = newBalance;
        distr.totalDistribution = distr.totalDistribution + increment;

        uint256 snapshotId = IIERC20(erc20DividendAddress).snapshot();
        distr.snapshots.push(
            LibTokenDividendPool.SnapshotInfo(snapshotId, _amount)
        );
        emit Distribute(_token, _amount);
    }


    /// @inheritdoc ITokenDividendPool
    function claimable(address _token, address _account) public view override returns (uint256) {
        LibTokenDividendPool.Distribution storage distr = distributions[_token];
        uint256 startSnapshotIndex = distr.nonClaimedSnapshotIndex[_account];
        uint256 endSnapshotIndex = distr.snapshots.length;
        return _calculateClaim(
            _token,
            _account,
            startSnapshotIndex,
            endSnapshotIndex
        );
    }

    /// @inheritdoc ITokenDividendPool
    function getAvailableClaims(address _account) public view override returns (address[] memory claimableTokens, uint256[] memory claimableAmounts) {
        uint256[] memory amounts = new uint256[](distributedTokens.length);
        uint256 claimableCount = 0;
        for (uint256 i = 0; i < distributedTokens.length; ++i) {
            amounts[i] = claimable(distributedTokens[i], _account);
            if (amounts[i] > 0) {
                claimableCount += 1;
            }
        }

        claimableAmounts = new uint256[](claimableCount);
        claimableTokens = new address[](claimableCount);
        uint256 j = 0;
        for (uint256 i = 0; i < distributedTokens.length; ++i) {
            if (amounts[i] > 0) {
                claimableAmounts[j] = amounts[i];
                claimableTokens[j] = distributedTokens[i];
                j++;
            }
        }
    }

    /// @inheritdoc ITokenDividendPool
    function claimableForPeriod(
        address _token,
        address _account,
        uint256 _startSnapshotIndex,
        uint256 _endSnapshotIndex
    ) public view override returns (uint256) {
        return _calculateClaim(
            _token,
            _account,
            _startSnapshotIndex,
            _endSnapshotIndex
        );
    }

    /// @dev Claim rewards
    function _claimUpTo(address _token, address _account, uint256 _endSnapshotIndex) internal ifFree {
        LibTokenDividendPool.Distribution storage distr = distributions[_token];
        uint256 startSnapshotIndex = distr.nonClaimedSnapshotIndex[_account];
        uint256 endSnapshotIndex = distr.snapshots.length;
        uint256 amountToClaim = _calculateClaim(
            _token,
            _account,
            startSnapshotIndex,
            endSnapshotIndex
        );

        require(amountToClaim > 0, "Amount to be claimed is zero");
        IERC20(_token).transfer(msg.sender, amountToClaim);

        distr.nonClaimedSnapshotIndex[_account] = _endSnapshotIndex;
        distr.lastBalance -= amountToClaim;
        emit Claim(_token, amountToClaim, _endSnapshotIndex);
    }

    /// @dev Amount claimable
    function _calculateClaim(
        address _token,
        address _account,
        uint256 _startSnapshotIndex,
        uint256 _endSnapshotIndex
    ) internal view returns (uint256) {
        LibTokenDividendPool.Distribution storage distr = distributions[_token];

        uint256 accumulated = 0;
        for (
            uint256 snapshotIndex = _startSnapshotIndex;
            snapshotIndex < _endSnapshotIndex;
            snapshotIndex = snapshotIndex + 1
        ) {
            uint256 snapshotId = distr.snapshots[snapshotIndex].id;
            uint256 totalDividendAmount = distr.snapshots[snapshotIndex].totalDividendAmount;
            accumulated +=  _calculateClaimPerSnapshot( 
                                _account,
                                snapshotId,
                                totalDividendAmount
                            );
        }
        return accumulated;
    }

    /// @dev Calculates claim portion
    function _calculateClaimPerSnapshot(
        address _account,
        uint256 _snapshotId,
        uint256 _totalDividendAmount
    ) internal view returns (uint256) {
        uint256 balance = IIERC20(erc20DividendAddress).balanceOfAt(_account, _snapshotId);
        if (balance == 0) {
            return 0;
        }

        uint256 supply = IIERC20(erc20DividendAddress).totalSupplyAt(_snapshotId);
        if (supply == 0) {
            return 0;
        }

        return _totalDividendAmount * balance / supply;
    }
}