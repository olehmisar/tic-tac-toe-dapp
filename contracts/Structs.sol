// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.4;

// TODO: find a way to pass structs to Game.sol without this file.

struct Move {
    address player;
    uint256 i;
    uint256 j;
}

struct State {
    address lastPlayer;
    address[3][3] board;
}

struct GameEndRequest {
    address requester;
    uint256 createdAt;
    uint8 kind;
    Move move;
    // Signature of all previous moves + move from this request.
    bytes signature;
}
