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

    mapping(uint256 => Game) public getGame;
    mapping(address => uint256) public getGameId;
    mapping(address => uint256) public nonces;

    uint8 public constant IN_PROGRESS = 0;
    uint8 public constant WON = 1;
    uint8 public constant DRAW = 2;

    uint8 public constant SIZE = 3;
    struct State {
        address lastPlayer;
        address[SIZE][SIZE] board;
    }

    function startGame(address creator, address joined, bytes calldata sig0, bytes calldata sig1) external {
        require(creator != joined, "same address");
        require(getGameId[creator] == 0, "already playing");
        require(getGameId[joined] == 0, "already playing");
        bytes32 hash = encodeGameStart(creator, joined);
        // TODO: uncomment
        // _verify(hash, creator, sig0);
        _verify(hash, joined, sig1);

        uint256 gameId = calcGameId(creator);
        nonces[creator]++;
        getGameId[creator] = gameId;
        getGameId[joined] = gameId;
        getGame[gameId] = Game({
            player0: creator,
            player1: joined,
            result: IN_PROGRESS,
            winner: address(0)
        });
    }

    function encodeGameStart(address player0, address player1) public view returns (bytes32) {
        // TODO: include gameId in this calculation
        // TODO: FIXME this hash is not unique
        return keccak256(abi.encode(address(this), player0, player1));
    }

    function calcGameId(address creator) public view returns (uint256) {
        return uint256(keccak256(abi.encode(address(this), creator, nonces[creator])));
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
        bytes32 hash = encodeWinner(gameId, result, winner);
        _verify(hash, me, mySig);
        _verify(hash, opponent, opponentSig);
        _endGame(game, result, winner);
    }

    function encodeWinner(uint256 gameId, uint8 result, address winner) public view returns (bytes32) {
        return keccak256(abi.encode(address(this), result, gameId, winner));
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
        _verify(encodeMoves(gameId, moves), me, mySig);
        _verify(encodeMoves(gameId, moves[0:moves.length - 1]), opponent, opponentSig);

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

    function _endGame(Game storage game, uint8 result, address winner) private {
        require(result == DRAW || result == WON, "bad result");
        if (result == DRAW) {
            require(winner == address(0), "!address(0)");
        }
        game.result = result;
        game.winner = winner;
        getGameId[game.player0] = 0;
        getGameId[game.player1] = 0;
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

    function _verify(bytes32 hash, address signer, bytes calldata signature) private pure {
        if (_recover(hash, signature) != signer) {
            revert BadSignature(signer);
        }
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
