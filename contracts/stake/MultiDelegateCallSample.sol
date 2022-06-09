// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

import "hardhat/console.sol";


contract MultiDelegateCallSample
{
    struct Call {
        address target;
        uint256 gasLimit;
        bytes callData;
    }

    struct Result {
        bool success;
        uint256 gasUsed;
        bytes returnData;
    }

    event CallFunction(address target, address sender);
    event CallMultiCall(address target, address sender, uint256 userGas, uint256 gasUsed);
    event CallMultiOnce(address target, uint256 gasLimit, bytes _data, address sender, uint256 gasUsed);

    function multicall(Call[] memory calls) external returns (uint256 blockNumber, Result[] memory returnData) {
        require(calls.length > 0, "zero calls.length");
        blockNumber = block.number;
        returnData = new Result[](calls.length);

        uint256 userGas = gasleft();

        for (uint256 i = 0; i < calls.length; i++) {
            (address target, uint256 gasLimit, bytes memory callData) = (calls[i].target, calls[i].gasLimit, calls[i].callData);
            uint256 gasLeftBefore = gasleft();

            //console.log("gasLeftBefore %s", gasLeftBefore);
            (bool success, bytes memory ret) = target.delegatecall{gas: gasLimit}(callData);
            require(success, "delegatecall fail");

            uint256 gasUsed = gasLeftBefore - gasleft();
            // console.log("gasUsed %s", gasUsed);
            // console.logBytes(ret);
            // console.logBool(success);

            returnData[i] = Result(success, gasUsed, ret);

            emit CallMultiCall(target, msg.sender, userGas, gasUsed);
        }
    }

    function claim(address _target, uint256 _gas, address _token) external {

        (bool success, bytes memory ret) = _target.delegatecall{gas: _gas}(
            abi.encodeWithSignature("claim(address)", _token)
        );
        require(success, "delegatecall fail");
    }


    function claim(address _target, uint256 _gas, address _token) external {

        (bool success, bytes memory ret) = _target.delegatecall{gas: _gas}(
            abi.encodeWithSignature("claim(address)", _token)
        );
        require(success, "delegatecall fail");
    }

    function callFunction(address target, bytes memory data) external {
        (bool success, bytes memory ret) =  target.delegatecall(data);
        require(success, "delegatecall fail");
        emit CallFunction(target, msg.sender);
    }


    /*
    function multicall(Call[] memory calls) external returns (uint256 blockNumber, Result[] memory returnData) {
        require(calls.length > 0, "zero calls.length");
        blockNumber = block.number;
        returnData = new Result[](calls.length);
        for (uint256 i = 0; i < calls.length; i++) {
            (address target, bytes memory callData) = (calls[i].target, calls[i].callData);

            (bool success, bytes memory ret) = target.delegatecall(callData);
            require(success, "delegatecall fail");

            returnData[i] = Result(success, ret);
        }
    }
    */
}