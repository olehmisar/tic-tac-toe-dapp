// SPDX-License-Identifier: Unlicensed
pragma solidity 0.8.4;

import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {State, Move, GameEndRequest} from "./Structs.sol";


abstract contract Game {
    struct GameInfo {
        address player0;
        address player1;
        address winner;
        uint8 result;
    }

    error BadSignature(address signer);

    mapping(uint256 => GameInfo) public getGame;
    mapping(address => uint256) public nonces;
    mapping(uint256 => GameEndRequest) public getEndGameWithTimeoutRequest;
    // TODO: adjust this value
    // TODO: should this be configurable per game?
    uint256 public constant GAME_END_TIMEOUT = 1 hours;

    uint8 public constant IN_PROGRESS = 0;
    uint8 public constant WON = 1;
    uint8 public constant DRAW = 2;

    uint8 public constant REQUEST_CANCEL_END_GAME = 0;
    uint8 public constant REQUEST_END_GAME = 1;

    function initialState(uint256 gameId) public virtual view returns (State memory);
    function doMove(State memory state, Move calldata move) public virtual pure returns (State memory);
    function checkWinners(State memory state, uint256 movesLength, address me, address opponent)
        public virtual pure returns (uint8 result, address winner);

    /////////////
    // START GAME
    /////////////

    function startGame(uint256 gameId, address creator, address joined, bytes calldata creatorSig, bytes calldata joinedSig) public virtual {
        require(creator != joined, "same address");
        require(gameId == calcGameId(creator), "bad gameId");
        _verify(encodeGameStart(gameId, creator, joined), creator, creatorSig);
        _verify(encodeGameStart(gameId, creator, joined), joined, joinedSig);
        nonces[creator]++;
        getGame[gameId] = GameInfo({
            player0: creator,
            player1: joined,
            result: IN_PROGRESS,
            winner: address(0)
        });
    }

    function calcGameId(address creator) public view returns (uint256) {
        return uint256(keccak256(abi.encode(block.chainid, address(this), creator, nonces[creator])));
    }

    function encodeGameStart(uint256 gameId, address creator, address joined) public pure returns (bytes32) {
        return keccak256(abi.encode(gameId, creator, joined));
    }

    function validateMsgSender(uint256 gameId) public view returns (address me, address opponent) {
        GameInfo storage game = getGame[gameId];
        (address player0, address player1) = (game.player0, game.player1);
        if (player0 == msg.sender) {
            (me, opponent) = (player0, player1);
        } else {
            require(player1 == msg.sender, "!player");
            (me, opponent) = (player1, player0);
        }
    }

    ///////////////////////
    // END GAME WITH RESULT
    ///////////////////////

    function endGameWithResult(
        uint256 gameId,
        uint8 result,
        address winner,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external {
        (address me, address opponent) = validateMsgSender(gameId);
        bytes32 hash = encodeResult(gameId, result, winner);
        _verify(hash, me, mySig);
        _verify(hash, opponent, opponentSig);
        _endGame(gameId, result, winner);
    }

    function encodeResult(uint256 gameId, uint8 result, address winner) public pure returns (bytes32) {
        return keccak256(abi.encode(gameId, result, winner));
    }

    //////////////////////
    // END GAME WITH MOVES
    //////////////////////

    function endGameWithMoves(
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external {
        (, uint8 result, address winner) = validateMoves(gameId, moves, mySig, opponentSig);
        _endGame(gameId, result, winner);
    }

    function validateMoves(
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) public view returns (State memory state, uint8 result, address winner) {
        (address me, address opponent) = validateMsgSender(gameId);
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
        Move[] calldata _moves = moves[0:moves.length - offset];
        // Do not verify empty moves because users do not make initial signatures
        if (_moves.length == 0) {
            return;
        }
        _verify(encodeMoves(gameId, _moves), signer, signature);
    }

    ////////////////////////
    // END GAME WITH TIMEOUT
    ////////////////////////

    function endGameWithTimeout(uint256 gameId) external {
        (address me,) = validateMsgSender(gameId);
        GameEndRequest storage request = getEndGameWithTimeoutRequest[gameId];
        require(request.kind == REQUEST_END_GAME, "!requested");
        require(request.requester == me, "!requester");
        require(block.timestamp > request.createdAt + GAME_END_TIMEOUT, "!timed out");
        _endGame(gameId, WON, me);
    }

    function requestGameEndWithTimeout(
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external {
        _makeGameEndWithTimeoutRequest(REQUEST_END_GAME, gameId, moves, mySig, opponentSig);
    }

    function cancelGameEndWithTimeoutRequest(
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) external {
        _makeGameEndWithTimeoutRequest(REQUEST_CANCEL_END_GAME, gameId, moves, mySig, opponentSig);
    }

    function _makeGameEndWithTimeoutRequest(
        uint8 kind,
        uint256 gameId,
        Move[] calldata moves,
        bytes calldata mySig,
        bytes calldata opponentSig
    ) private {
        require(getGame[gameId].result == IN_PROGRESS, "game ended");
        require(moves.length > 1, "!moves");
        (address me,) = validateMsgSender(gameId);
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

    //////////////////
    // PRIVATE METHODS
    //////////////////

    function _endGame(uint256 gameId, uint8 result, address winner) internal virtual {
        GameInfo storage game = getGame[gameId];
        require(game.result == IN_PROGRESS, "game ended");
        require(result != IN_PROGRESS, "!end");
        if (result == DRAW) {
            require(winner == address(0), "!address(0)");
        }
        game.result = result;
        game.winner = winner;
    }

    function _verify(bytes32 hash, address signer, bytes calldata signature) internal pure {
        if (ECDSA.recover(ECDSA.toEthSignedMessageHash(hash), signature) != signer) {
            revert BadSignature(signer);
        }
    }
}
