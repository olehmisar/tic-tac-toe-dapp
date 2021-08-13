// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


struct Game {
    address player0;
    address player1;
    address winner;
}

struct State {
    address lastPlayer;
    address[3][3] board;
}

struct Move {
    address player;
    uint256 i;
    uint256 j;
}

contract TicTacToe {
    error BadSignature(address signer);

    Game[] public getGame;

    function gamesLength() external view returns (uint256) {
        return getGame.length;
    }

    function startGame(address player0, address player1) external {
        getGame.push(Game({
            player0: player0,
            player1: player1,
            winner: address(0)
        }));
    }

    function endGameWithWinner(
        uint256 gameId,
        address winner,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external {
        Game storage game = getGame[gameId];
        require(game.winner == address(0), "game ended");
        (address me, address opponent) = _validateMsgSender(game.player0, game.player1);
        _verifyWinner(gameId, winner, me, mySig);
        _verifyWinner(gameId, winner, opponent, opponentSig);
        game.winner = winner;
    }

    function encodeWinner(uint256 gameId, address winner) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), gameId, winner));
    }

    function _verifyWinner(uint256 gameId, address winner, address signer, bytes calldata signature) private view {
        if (_recover(encodeWinner(gameId, winner), signature) != signer) {
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
        require(game.winner == address(0), "game ended");
        (address me, address opponent) = _validateMsgSender(game.player0, game.player1);
        _verifyMoves(gameId, moves, me, mySig);
        _verifyMoves(gameId, moves[0:moves.length - 1], opponent, opponentSig);

        address[3][3] memory board;
        State memory state = State({
            lastPlayer: game.player1,  // player0 should start
            board: board
        });
        for (uint256 i = 0; i < moves.length; i++) {
            doMove(state, moves[i]);
        }
        require(checkWinner(state.board, me), "!winner");
        game.winner = me;
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

    function checkWinner(address[3][3] memory board, address winner) public pure returns (bool) {
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
            for (uint256 i = rows; i > 0; i--) {
                if (board[i-1][i-1] == winner) {
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
