// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


struct Game {
    address player0;
    address player1;
    address winner;
    uint8 result;
}

struct Move {
    address player;
    uint256 i;
    uint256 j;
}

contract TicTacToe {
    error BadSignature(address signer);

    Game[] public getGame;
    uint8 public constant IN_PROGRESS = 0;
    uint8 public constant WON = 1;
    uint8 public constant DRAW = 2;

    uint8 public constant SIZE = 3;
    struct State {
        address lastPlayer;
        address[SIZE][SIZE] board;
    }

    function gamesLength() external view returns (uint256) {
        return getGame.length;
    }

    function startGame(address player0, address player1) external {
        getGame.push(Game({
            player0: player0,
            player1: player1,
            result: IN_PROGRESS,
            winner: address(0)
        }));
    }

    function endGameWithWinner(
        uint256 gameId,
        uint8 result,
        address winner,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external {
        Game storage game = getGame[gameId];
        require(game.result == IN_PROGRESS, "game ended");
        (address me, address opponent) = _validateMsgSender(game.player0, game.player1);
        _verifyWinner(gameId, result, winner, me, mySig);
        _verifyWinner(gameId, result, winner, opponent, opponentSig);
        _endGame(game, result, winner);
    }

    function encodeWinner(uint256 gameId, uint8 result, address winner) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), result, gameId, winner));
    }

    function _verifyWinner(uint256 gameId, uint8 result, address winner, address signer, bytes calldata signature) private view {
        if (_recover(encodeWinner(gameId, result, winner), signature) != signer) {
            revert BadSignature(signer);
        }
    }

    function endGameWithMoves(
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external {
        Game storage game = getGame[gameId];
        require(game.result == IN_PROGRESS, "game ended");
        (address me, address opponent) = _validateMsgSender(game.player0, game.player1);
        _verifyMoves(gameId, moves, me, mySig);
        _verifyMoves(gameId, moves[0:moves.length - 1], opponent, opponentSig);

        address[SIZE][SIZE] memory board;
        State memory state = State({
            lastPlayer: game.player1,  // player0 should start
            board: board
        });
        for (uint256 i = 0; i < moves.length; i++) {
            doMove(state, moves[i]);
        }

        if (checkWinner(state.board, me)) {
            _endGame(game, WON, me);
            return;
        }
        if (!checkWinner(state.board, opponent) && moves.length == SIZE * SIZE) {
            _endGame(game, DRAW, address(0));
            return;
        }
        revert("!end");
    }

    function encodeMoves(uint256 gameId, Move[] calldata moves) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), gameId, moves));
    }

    function _verifyMoves(
        uint256 gameId,
        Move[] calldata moves,
        address signer,
        bytes calldata signature
    ) private view {
        if (_recover(encodeMoves(gameId, moves), signature) != signer) {
            revert BadSignature(signer);
        }
    }

    function _endGame(Game storage game, uint8 result, address winner) private {
        require(result == DRAW || result == WON, "bad result");
        if (result == DRAW) {
            require(winner == address(0), "!address(0)");
        }
        game.result = result;
        game.winner = winner;
    }

    function _validateMsgSender(address player0, address player1) private view returns (address me, address opponent) {
        if (player0 == msg.sender) {
            (me, opponent) = (player0, player1);
        } else {
            require(player1 == msg.sender, "!player");
            (me, opponent) = (player1, player0);
        }
    }

    function _recover(bytes32 hash, bytes calldata signature) private pure returns (address) {
        return ECDSA.recover(ECDSA.toEthSignedMessageHash(hash), signature);
    }

    // GAME LOGIC
    function doMove(State memory state, Move calldata move) public pure returns (State memory) {
        require(state.board[move.i][move.j] == address(0), "!empty");
        require(move.player != state.lastPlayer, "!turn");
        state.board[move.i][move.j] = move.player;
        state.lastPlayer = move.player;
        return state;
    }

    function checkWinner(address[SIZE][SIZE] memory board, address winner) public pure returns (bool) {
        (uint256 rows, uint256 cols) = (board.length, board[0].length);
        require(rows == cols, "rows != cols");

        // Check verticals
        for (uint256 i = 0; i < rows; i++) {
            uint256 sum = 0;
            for (uint256 j = 0; j < cols; j++) {
                if (board[i][j] == winner) {
                    sum += 1;
                }
            }
            if (sum == cols) {
                return true;
            }
        }

        // Check horizontals
        for (uint256 j = 0; j < cols; j++) {
            uint256 sum = 0;
            for (uint256 i = 0; i < rows; i++) {
                if (board[i][j] == winner) {
                    sum += 1;
                }
            }
            if (sum == rows) {
                return true;
            }
        }

        // Check diagonals
        {
            uint256 sum = 0;
            for (uint256 i = 0; i < rows; i++) {
                if (board[i][i] == winner) {
                    sum += 1;
                }
            }
            if (sum == rows) {
                return true;
            }
        }
        {
            uint256 sum = 0;
            for (uint256 i = 0; i < rows; i++) {
                if (board[rows - i - 1][i] == winner) {
                    sum += 1;
                }
            }
            if (sum == rows) {
                return true;
            }
        }

        return false;
    }
}
