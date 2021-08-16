// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";


struct Game {
    address player0;
    address player1;
    address winner;
    uint8 result;
}

struct GameEndRequest {
    address requester;
    uint256 createdAt;
    uint8 kind;
    Move move;
    // Signature of all previous moves + move from this request.
    bytes signature;
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

    mapping(uint256 => GameEndRequest) public getEndGameWithTimeoutRequest;
    // TODO: adjust this value
    // TODO: should this be configurable per game?
    uint256 public constant GAME_END_TIMEOUT = 1 hours;
    uint8 public constant REQUEST_CANCEL_END_GAME = 0;
    uint8 public constant REQUEST_END_GAME = 1;

    uint8 public constant IN_PROGRESS = 0;
    uint8 public constant WON = 1;
    uint8 public constant DRAW = 2;

    uint8 public constant SIZE = 3;
    struct State {
        address lastPlayer;
        address[SIZE][SIZE] board;
    }

    modifier isInProgress(uint256 gameId) {
        require(getGame[gameId].result == IN_PROGRESS, "game ended");
        _;
    }

    function startGame(address creator, address joined, bytes calldata creatorSig, bytes calldata joinedSig) external {
        require(creator != joined, "same address");
        require(getGameId[creator] == 0, "already playing");
        require(getGameId[joined] == 0, "already playing");
        uint256 gameId = calcGameId(creator);
        // TODO: should we include `joined` in `creatorSig`?
        _verify(encodeGameStart(gameId, creator, address(0)), creator, creatorSig);
        _verify(encodeGameStart(gameId, creator, joined), joined, joinedSig);
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

    function encodeGameStart(uint256 gameId, address creator, address joined) public pure returns (bytes32) {
        return keccak256(abi.encode(gameId, creator, joined));
    }

    function calcGameId(address creator) public view returns (uint256) {
        return uint256(keccak256(abi.encode(block.chainid, address(this), creator, nonces[creator])));
    }

    function endGameWithWinner(
        uint256 gameId,
        uint8 result,
        address winner,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external isInProgress(gameId) {
        Game storage game = getGame[gameId];
        (address me, address opponent) = _validateMsgSender(game);
        bytes32 hash = encodeWinner(gameId, result, winner);
        _verify(hash, me, mySig);
        _verify(hash, opponent, opponentSig);
        _endGame(game, result, winner);
    }

    function encodeWinner(uint256 gameId, uint8 result, address winner) public pure returns (bytes32) {
        return keccak256(abi.encode(gameId, result, winner));
    }

    function endGameWithMoves(
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external isInProgress(gameId) {
        (, uint8 result, address winner) = validateMoves(gameId, moves, mySig, opponentSig);
        _endGame(getGame[gameId], result, winner);
    }

    function validateMoves(
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) public view returns (State memory state, uint8 result, address winner) {
        (address me, address opponent) = _validateMsgSender(getGame[gameId]);
        _verifyMoves(gameId, moves, me, mySig);
        _verifyMoves(gameId, moves, opponent, opponentSig);
        state = initialState(gameId);
        for (uint256 i = 0; i < moves.length; i++) {
            doMove(state, moves[i]);
        }
        (result, winner) = checkWinners(state, moves.length, me, opponent);
    }

    function encodeMoves(uint256 gameId, Move[] calldata moves) public pure returns (bytes32) {
        return keccak256(abi.encode(gameId, moves));
    }

    function _verifyMoves(uint256 gameId, Move[] calldata moves, address signer, bytes calldata signature) private pure {
        // the last player must sign all moves; the second last player must sign `moves.length - 1` moves.
        uint256 offset = moves.length > 0 && moves[moves.length - 1].player != signer ? 1 : 0;
        _verify(encodeMoves(gameId, moves[0:moves.length - offset]), signer, signature);
    }

    function requestGameEndWithTimeout(
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external isInProgress(gameId) {
        _makeGameEndWithTimeoutRequest(REQUEST_END_GAME, gameId, moves, mySig, opponentSig);
    }

    function cancelGameEndWithTimeoutRequest(
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external isInProgress(gameId) {
        _makeGameEndWithTimeoutRequest(REQUEST_CANCEL_END_GAME, gameId, moves, mySig, opponentSig);
    }

    function _makeGameEndWithTimeoutRequest(
        uint8 kind,
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) private {
        (address me,) = _validateMsgSender(getGame[gameId]);
        require(moves.length > 0, "!moves");
        Move calldata lastMove = moves[moves.length - 1];
        require(lastMove.player == me, "move not provided");
        (, uint8 result,) = validateMoves(gameId, moves, mySig, opponentSig);
        require(result == IN_PROGRESS, "!in progress");
        getEndGameWithTimeoutRequest[gameId] = GameEndRequest({
            requester: me,
            kind: kind,
            createdAt: block.timestamp,
            move: lastMove,
            signature: mySig
        });
    }

    function endGameWithTimeout(uint256 gameId) external isInProgress(gameId) {
        Game storage game = getGame[gameId];
        (address me,) = _validateMsgSender(game);
        GameEndRequest storage request = getEndGameWithTimeoutRequest[gameId];
        require(request.kind == REQUEST_END_GAME, "!requested");
        require(request.requester == me, "!requester");
        require(block.timestamp > request.createdAt + GAME_END_TIMEOUT, "!timed out");
        _endGame(game, WON, me);
    }

    function checkWinners(
        State memory state,
        uint256 movesLength,
        address me,
        address opponent
    ) public pure returns (uint8 result, address winner) {
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

    function _endGame(Game storage game, uint8 result, address winner) private {
        require(result == DRAW || result == WON, "!end");
        if (result == DRAW) {
            require(winner == address(0), "!address(0)");
        }
        game.result = result;
        game.winner = winner;
        getGameId[game.player0] = 0;
        getGameId[game.player1] = 0;
    }

    function _validateMsgSender(Game storage game) private view returns (address me, address opponent) {
        (address player0, address player1) = (game.player0, game.player1);
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
    function initialState(uint256 gameId) public view returns (State memory) {
        Game storage game = getGame[gameId];
        address[SIZE][SIZE] memory board;
        return State({
            lastPlayer: game.player1, // player0 should start
            board: board
        });
    }

    function doMove(State memory state, Move calldata move) public pure returns (State memory) {
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
}
