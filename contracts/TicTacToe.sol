// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.4;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {Game} from "./Game.sol";
import {State, Move} from "./Structs.sol";


contract TicTacToe is Game {
    using EnumerableSet for EnumerableSet.UintSet;

    mapping(address => EnumerableSet.UintSet) private _unfinishedGameIds;
    uint8 public constant SIZE = 3;

    function unfinishedGameIds(address player) external view returns (uint256[] memory) {
        return _getEnumerableSetValues(_unfinishedGameIds[player]);
    }

    function startGame(uint256 gameId, address creator, address joined, bytes calldata creatorSig, bytes calldata joinedSig) public override {
        _unfinishedGameIds[creator].add(gameId);
        _unfinishedGameIds[joined].add(gameId);
        super.startGame(gameId, creator, joined, creatorSig, joinedSig);
    }

    function _endGame(uint256 gameId, uint8 result, address winner) internal override {
        GameInfo storage game = getGame[gameId];
        _unfinishedGameIds[game.player0].remove(gameId);
        _unfinishedGameIds[game.player1].remove(gameId);
        super._endGame(gameId, result, winner);
    }

    // GAME LOGIC
    function checkWinners(
        State memory state,
        uint256 movesLength,
        address me,
        address opponent
    ) public override pure returns (uint8 result, address winner) {
        (result, winner) = (IN_PROGRESS, address(0));
        bool iWon = checkWinner(state.board, me);
        bool opponentWon = checkWinner(state.board, opponent);
        if (iWon) {
            require(!opponentWon, "two winners");
            return (WON, me);
        }
        if (opponentWon) {
            return (WON, opponent);
        }
        if (movesLength == SIZE * SIZE) {
            return (DRAW, address(0));
        }
        return (IN_PROGRESS, address(0));
    }

    function initialState(uint256 gameId) public override view returns (State memory) {
        address[SIZE][SIZE] memory board;
        return State({
            lastPlayer: getGame[gameId].player1, // player0 should start
            board: board
        });
    }

    function doMove(State memory state, Move calldata move) public override pure returns (State memory) {
        require(state.board[move.i][move.j] == address(0), "!empty");
        require(move.player != state.lastPlayer, "!turn");
        state.board[move.i][move.j] = move.player;
        state.lastPlayer = move.player;
        return state;
    }

    function checkWinner(address[SIZE][SIZE] memory board, address winner) public pure returns (bool) {
        // Check verticals
        for (uint256 i = 0; i < SIZE; i++) {
            uint256 sum = 0;
            for (uint256 j = 0; j < SIZE; j++) {
                if (board[i][j] == winner) {
                    sum += 1;
                }
            }
            if (sum == SIZE) {
                return true;
            }
        }

        // Check horizontals
        for (uint256 j = 0; j < SIZE; j++) {
            uint256 sum = 0;
            for (uint256 i = 0; i < SIZE; i++) {
                if (board[i][j] == winner) {
                    sum += 1;
                }
            }
            if (sum == SIZE) {
                return true;
            }
        }

        // Check diagonals
        {
            uint256 sum = 0;
            for (uint256 i = 0; i < SIZE; i++) {
                if (board[i][i] == winner) {
                    sum += 1;
                }
            }
            if (sum == SIZE) {
                return true;
            }
        }
        {
            uint256 sum = 0;
            for (uint256 i = 0; i < SIZE; i++) {
                if (board[SIZE - i - 1][i] == winner) {
                    sum += 1;
                }
            }
            if (sum == SIZE) {
                return true;
            }
        }

        return false;
    }

    // TODO: remove when https://github.com/OpenZeppelin/openzeppelin-contracts/issues/2825 is fixed
    function _getEnumerableSetValues(EnumerableSet.UintSet storage set) private view returns(uint256[] memory) {
        bytes32[] memory store = set._inner._values;
        uint256[] memory result;
        assembly {
            result := store
        }
        return result;
    }
}
