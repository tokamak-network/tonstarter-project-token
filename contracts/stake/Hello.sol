// SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0;

contract Hello {

    event CallHello(address sender);

    function hello() external returns (bool) {

        emit CallHello(msg.sender);

        return true;
    }
}