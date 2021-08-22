import { BigNumberish } from '@ethersproject/bignumber';
import { arrayify } from '@ethersproject/bytes';
import { AddressZero } from '@ethersproject/constants';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { evmIncreaseTime, getBlockTimestamp, snapshottedBeforeEach } from '../shared/utils';
import { TicTacToe } from '../typechain';
import { expectMoveEqual } from './matchers';

export interface Move {
  player: string;
  i: BigNumberish;
  j: BigNumberish;
}

const IN_PROGRESS = 0;
const WON = 1;
const DRAW = 2;

const REQUEST_CANCEL_END_GAME = 0;
const REQUEST_END_GAME = 1;

const GAME_END_TIMEOUT = 60 * 60; // 1 hour

describe('TicTacToe', () => {
  let player0Account: SignerWithAddress, player1Account: SignerWithAddress, player2Account: SignerWithAddress;
  let player0: string, player1: string, player2: string;
  let lobby: TicTacToe;
  let winMoves: Move[];
  let drawMoves: Move[];
  let inProgressMoves: Move[];
  let randomSig: string;
  before(async () => {
    [player0Account, player1Account, player2Account] = await ethers.getSigners();
    [player0, player1, player2] = [player0Account, player1Account, player2Account].map((acc) => acc.address);

    randomSig = await player0Account.signMessage('hello world');

    winMoves = [
      { player: player0, i: 0, j: 0 },
      { player: player1, i: 1, j: 0 },
      { player: player0, i: 0, j: 1 },
      { player: player1, i: 1, j: 1 },
      { player: player0, i: 0, j: 2 },
    ];
    drawMoves = [
      { player: player0, i: 0, j: 0 },
      { player: player1, i: 0, j: 1 },
      { player: player0, i: 0, j: 2 },
      { player: player1, i: 1, j: 0 },
      { player: player0, i: 1, j: 1 },
      { player: player1, i: 2, j: 0 },
      { player: player0, i: 1, j: 2 },
      { player: player1, i: 2, j: 2 },
      { player: player0, i: 2, j: 1 },
    ];
    inProgressMoves = [
      { player: player0, i: 0, j: 0 },
      { player: player1, i: 0, j: 1 },
      { player: player0, i: 0, j: 2 },
    ];
  });

  snapshottedBeforeEach(async () => {
    lobby = await (await ethers.getContractFactory('TicTacToe')).deploy();
  });

  async function signGameStart(signer: SignerWithAddress, player0: string, player1: string) {
    const gameId = await lobby.calcGameId(player0);
    return await signer.signMessage(arrayify(await lobby.encodeGameStart(gameId, player0, player1)));
  }

  async function signMoves(signer: SignerWithAddress, gameId: BigNumberish, moves: Move[]) {
    return await signer.signMessage(arrayify(await lobby.encodeMoves(gameId, moves)));
  }

  async function signMovesForBoth(gameId: BigNumberish, moves: Move[]) {
    const slicedMoves = moves.slice(0, -1);
    const [moves0, moves1] =
      moves.length > 0 && moves[moves.length - 1].player === player0 ? [moves, slicedMoves] : [slicedMoves, moves];
    return await Promise.all([signMoves(player0Account, gameId, moves0), signMoves(player1Account, gameId, moves1)]);
  }

  async function signResult(signer: SignerWithAddress, gameId: BigNumberish, result: BigNumberish, winner: string) {
    return await signer.signMessage(arrayify(await lobby.encodeResult(gameId, result, winner)));
  }

  async function startGame(acc0: SignerWithAddress, acc1: SignerWithAddress) {
    const sig0 = await signGameStart(acc0, acc0.address, acc1.address);
    const sig1 = await signGameStart(acc1, acc0.address, acc1.address);
    const gameId = await lobby.calcGameId(acc0.address);
    await lobby.startGame(gameId, acc0.address, acc1.address, sig0, sig1);
    return gameId;
  }

  async function endGame(gameId: BigNumberish) {
    const sig0 = await signResult(player0Account, gameId, DRAW, AddressZero);
    const sig1 = await signResult(player1Account, gameId, DRAW, AddressZero);
    await lobby.endGameWithResult(gameId, DRAW, AddressZero, sig0, sig1);
  }

  describe('constructor', () => {
    it('should have correct info', async () => {
      expect(await lobby.IN_PROGRESS()).to.eq(IN_PROGRESS);
      expect(await lobby.DRAW()).to.eq(DRAW);
      expect(await lobby.WON()).to.eq(WON);
      expect(await lobby.SIZE()).to.eq(3);
      expect(await lobby.REQUEST_CANCEL_END_GAME()).to.eq(REQUEST_CANCEL_END_GAME);
      expect(await lobby.REQUEST_END_GAME()).to.eq(REQUEST_END_GAME);
      expect(await lobby.GAME_END_TIMEOUT()).to.eq(GAME_END_TIMEOUT);
    });
  });

  describe('#startGame', () => {
    it('should create a game object', async () => {
      const sig0 = await signGameStart(player0Account, player0, player1);
      const sig1 = await signGameStart(player1Account, player0, player1);
      const gameId = await lobby.calcGameId(player0);
      await lobby.startGame(gameId, player0, player1, sig0, sig1);
      const game = await lobby.getGame(gameId);
      expect(game.player0).to.eq(player0);
      expect(game.player1).to.eq(player1);
      expect(game.result).to.eq(IN_PROGRESS);
      expect(game.winner).to.eq(AddressZero);
    });

    it('should NOT create a game if signatures are invalid', async () => {
      const sig0 = await signGameStart(player0Account, player0, player1);
      const sig1 = await signGameStart(player1Account, player1, player0);
      await expect(lobby.startGame(await lobby.calcGameId(player0), player0, player1, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
      await expect(lobby.startGame(await lobby.calcGameId(player1), player1, player0, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
    });

    it('should NOT create a game with themselves', async () => {
      await expect(startGame(player0Account, player0Account)).to.be.revertedWith('same address');
    });

    it('should allow to play again after game is finished', async () => {
      const gameId = await startGame(player0Account, player1Account);
      await startGame(player0Account, player1Account);
      await endGame(gameId);
      await startGame(player0Account, player1Account); // OK
    });

    it('should NOT allow to create game with the same ID', async () => {
      const sig0 = await signGameStart(player0Account, player0, player1);
      const sig1 = await signGameStart(player1Account, player0, player1);
      const gameId = await lobby.calcGameId(player0);
      await lobby.startGame(gameId, player0, player1, sig0, sig1);
      await expect(lobby.startGame(gameId, player0, player1, sig0, sig1)).to.be.revertedWith('bad gameId');
    });
  });

  describe('#unfinishedGameIds', () => {
    it('should be empty', async () => {
      expect(await lobby.unfinishedGameIds(player0)).to.deep.eq([]);
    });

    it('should add a game', async () => {
      const gameId = await startGame(player0Account, player1Account);
      expect(await lobby.unfinishedGameIds(player0)).to.deep.eq([gameId]);
      expect(await lobby.unfinishedGameIds(player1)).to.deep.eq([gameId]);
    });

    it('should remove game after finished', async () => {
      const gameId = await startGame(player0Account, player1Account);
      await endGame(gameId);
      expect(await lobby.unfinishedGameIds(player0)).to.deep.eq([]);
      expect(await lobby.unfinishedGameIds(player1)).to.deep.eq([]);
    });
  });

  describe('#endGameWithMoves', () => {
    let gameId: BigNumberish;
    snapshottedBeforeEach(async () => {
      gameId = await startGame(player0Account, player1Account);
    });

    it('should end a game with valid moves', async () => {
      const sig0 = await signMoves(player0Account, gameId, winMoves);
      const sig1 = await signMoves(player1Account, gameId, winMoves.slice(0, winMoves.length - 1));
      await lobby.endGameWithMoves(gameId, winMoves, sig0, sig1);
      const game = await lobby.getGame(gameId);
      expect(game.result).to.eq(WON);
      expect(game.winner).to.eq(player0);
    });

    it('should NOT end the game with invalid winner signature', async () => {
      const sig0 = await signMoves(player0Account, gameId, winMoves.slice(0, 1));
      const sig1 = await signMoves(player1Account, gameId, winMoves.slice(0, winMoves.length - 1));
      await expect(lobby.endGameWithMoves(gameId, winMoves, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player0}")'`,
      );
    });

    it('should NOT end the game with invalid loser signature', async () => {
      const sig0 = await signMoves(player0Account, gameId, winMoves);
      const sig1 = await signMoves(player1Account, gameId, winMoves);
      await expect(lobby.endGameWithMoves(gameId, winMoves, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
    });

    it('should NOT allow player1 to start', async () => {
      const moves = [{ player: player1, i: 0, j: 0 }];
      const [sig0, sig1] = await signMovesForBoth(gameId, moves);
      await expect(lobby.endGameWithMoves(gameId, moves, sig0, sig1)).to.be.revertedWith('!turn');
    });

    it('should NOT allow two consecutive moves', async () => {
      const moves = [
        { player: player0, i: 0, j: 0 },
        { player: player0, i: 0, j: 1 },
      ];
      const [sig0, sig1] = await signMovesForBoth(gameId, moves);
      await expect(lobby.endGameWithMoves(gameId, moves, sig0, sig1)).to.be.revertedWith('!turn');
    });

    it('should NOT allow to check already checked cell', async () => {
      const moves = [
        { player: player0, i: 0, j: 0 },
        { player: player1, i: 0, j: 0 },
      ];
      const [sig0, sig1] = await signMovesForBoth(gameId, moves);
      await expect(lobby.endGameWithMoves(gameId, moves, sig0, sig1)).to.be.revertedWith('!empty');
    });

    it('should NOT allow to request game end if game is already ended', async () => {
      const [sig0, sig1] = await signMovesForBoth(gameId, winMoves);
      await lobby.endGameWithMoves(gameId, winMoves, sig0, sig1);
      await expect(lobby.endGameWithMoves(gameId, winMoves, sig0, sig1)).to.be.revertedWith('game ended');
    });

    it('should NOT allow to end the game after a draw', async () => {
      const [sig0, sig1] = await signMovesForBoth(gameId, drawMoves);
      await lobby.endGameWithMoves(gameId, drawMoves, sig0, sig1);
      await expect(lobby.endGameWithMoves(gameId, drawMoves, sig0, sig1)).to.be.revertedWith('game ended');
    });
  });

  describe('#endGameWithResult', () => {
    let gameId: BigNumberish;
    snapshottedBeforeEach(async () => {
      gameId = await startGame(player0Account, player1Account);
    });

    it('should end the game with valid signatures and the same winner', async () => {
      const sig0 = await signResult(player0Account, gameId, WON, player0);
      const sig1 = await signResult(player1Account, gameId, WON, player0);
      await lobby.endGameWithResult(gameId, WON, player0, sig0, sig1);
      const game = await lobby.getGame(gameId);
      expect(game.result).to.eq(WON);
      expect(game.winner).to.eq(player0);
    });

    it('should end the game with draw result', async () => {
      const sig0 = await signResult(player0Account, gameId, DRAW, AddressZero);
      const sig1 = await signResult(player1Account, gameId, DRAW, AddressZero);
      await lobby.endGameWithResult(gameId, DRAW, AddressZero, sig0, sig1);
      const game = await lobby.getGame(gameId);
      expect(game.result).to.eq(DRAW);
      expect(game.winner).to.eq(AddressZero);
    });

    it('should NOT end the game with different winner', async () => {
      const sig0 = await signResult(player0Account, gameId, WON, player0);
      const sig1 = await signResult(player1Account, gameId, WON, player1);
      await expect(lobby.endGameWithResult(gameId, WON, player0, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
      await expect(lobby.endGameWithResult(gameId, WON, player1, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player0}")'`,
      );
    });

    it('should NOT end the game with invalid signatures', async () => {
      const sig0 = await signResult(player0Account, gameId, WON, player0);
      const sig1 = await signResult(player1Account, gameId, WON, player0);
      await expect(lobby.endGameWithResult(gameId, WON, player0, sig0, sig0)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
      await expect(lobby.endGameWithResult(gameId, WON, player0, sig1, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player0}")'`,
      );
    });

    it('should NOT end the game with draw result and non-zero address', async () => {
      const sig0 = await signResult(player0Account, gameId, DRAW, player0);
      const sig1 = await signResult(player1Account, gameId, DRAW, player0);
      await expect(lobby.endGameWithResult(gameId, DRAW, player0, sig0, sig1)).to.be.revertedWith('!address(0)');
    });

    it('should NOT end the game after win', async () => {
      const sig0 = await signResult(player0Account, gameId, WON, player0);
      const sig1 = await signResult(player1Account, gameId, WON, player0);
      await lobby.endGameWithResult(gameId, WON, player0, sig0, sig1);
      await expect(lobby.endGameWithResult(gameId, WON, player0, sig0, sig1)).to.be.revertedWith('game ended');
    });

    it('should NOT end the game after draw', async () => {
      const sig0 = await signResult(player0Account, gameId, DRAW, AddressZero);
      const sig1 = await signResult(player1Account, gameId, DRAW, AddressZero);
      await lobby.endGameWithResult(gameId, DRAW, AddressZero, sig0, sig1);
      await expect(lobby.endGameWithResult(gameId, DRAW, AddressZero, sig0, sig1)).to.be.revertedWith('game ended');
    });
  });

  describe('#endGameWithTimeout', () => {
    let gameId: BigNumberish;
    snapshottedBeforeEach(async () => {
      gameId = await startGame(player0Account, player1Account);
    });

    it('should end the game', async () => {
      await lobby.requestGameEndWithTimeout(
        gameId,
        inProgressMoves,
        ...(await signMovesForBoth(gameId, inProgressMoves)),
      );
      await evmIncreaseTime(GAME_END_TIMEOUT);
      await lobby.endGameWithTimeout(gameId);
      const game = await lobby.getGame(gameId);
      expect(game.result).to.eq(WON);
      expect(game.winner).to.eq(player0);
    });

    it('should NOT end the game if msg.sender is not the requester', async () => {
      await lobby.requestGameEndWithTimeout(
        gameId,
        inProgressMoves,
        ...(await signMovesForBoth(gameId, inProgressMoves)),
      );
      await evmIncreaseTime(GAME_END_TIMEOUT);
      await expect(lobby.connect(player1Account).endGameWithTimeout(gameId)).to.be.revertedWith('!requester');
    });

    it('should NOT end the game if is not timed out yet', async () => {
      const moves = [{ player: player0, i: 0, j: 0 }];
      await lobby.requestGameEndWithTimeout(
        gameId,
        inProgressMoves,
        ...(await signMovesForBoth(gameId, inProgressMoves)),
      );
      await evmIncreaseTime(GAME_END_TIMEOUT - 1);
      await expect(lobby.endGameWithTimeout(gameId)).to.be.revertedWith('!timed out');
    });

    it('should NOT end the game if not requested', async () => {
      await expect(lobby.endGameWithTimeout(gameId)).to.be.revertedWith('!requested');
    });

    it('should NOT end the game after request is cancelled', async () => {
      // Request
      await lobby.requestGameEndWithTimeout(
        gameId,
        inProgressMoves,
        ...(await signMovesForBoth(gameId, inProgressMoves)),
      );
      // Cancel
      const moreMoves = [...inProgressMoves, { player: player1, i: 2, j: 2 }];
      const [sig0, sig1] = await signMovesForBoth(gameId, moreMoves);
      await lobby.connect(player1Account).cancelGameEndWithTimeoutRequest(gameId, moreMoves, sig1, sig0);
      await expect(lobby.endGameWithTimeout(gameId)).to.be.revertedWith('!requested');
    });

    it('should NOT end the game if game is already ended', async () => {
      await endGame(gameId);
      await expect(
        lobby.requestGameEndWithTimeout(gameId, [], ...(await signMovesForBoth(gameId, []))),
      ).to.be.revertedWith('game ended');
    });

    describe('#requestGameEndWithTimeout', () => {
      let moves: Move[];
      snapshottedBeforeEach(async () => {
        moves = [
          { player: player0, i: 0, j: 0 },
          { player: player1, i: 0, j: 1 },
          { player: player0, i: 0, j: 2 },
        ];
      });

      it('should request game end and save the latest move to the state', async () => {
        await lobby.requestGameEndWithTimeout(gameId, moves, ...(await signMovesForBoth(gameId, moves)));
        const req = await lobby.getEndGameWithTimeoutRequest(gameId);
        expect(req.requester).to.eq(player0);
        expect(req.kind).to.eq(REQUEST_END_GAME);
        expect(req.createdAt).to.eq(await getBlockTimestamp());
        expectMoveEqual(req.move, moves[moves.length - 1]);
        expect(req.signature).to.eq(await signMoves(player0Account, gameId, moves));
      });

      it('should NOT request game end if opponent has not made a move', async () => {
        const moves = [{ player: player0, i: 0, j: 0 }];
        await expect(
          lobby.requestGameEndWithTimeout(gameId, moves, ...(await signMovesForBoth(gameId, moves))),
        ).to.be.revertedWith('!moves');
      });

      it('should NOT request game end if game is already ended', async () => {
        await endGame(gameId);
        await expect(lobby.requestGameEndWithTimeout(gameId, [], randomSig, randomSig)).to.be.revertedWith(
          'game ended',
        );
      });

      it('should NOT request game end with empty moves', async () => {
        await expect(
          lobby.requestGameEndWithTimeout(gameId, [], ...(await signMovesForBoth(gameId, []))),
        ).to.be.revertedWith('!moves');
      });

      it("should NOT request game end if the last move is not requester's move", async () => {
        const moves = [
          { player: player0, i: 0, j: 0 },
          { player: player1, i: 0, j: 1 },
        ];
        await expect(
          lobby.requestGameEndWithTimeout(gameId, moves, ...(await signMovesForBoth(gameId, moves))),
        ).to.be.revertedWith('move not provided');
      });

      it('should NOT request game end with invalid moves', async () => {
        const invalidMoves = [
          { player: player0, i: 0, j: 0 },
          { player: player1, i: 0, j: 1 },
          { player: player0, i: 0, j: 1 },
        ];
        await expect(
          lobby.requestGameEndWithTimeout(gameId, invalidMoves, ...(await signMovesForBoth(gameId, invalidMoves))),
        ).to.be.revertedWith('!empty');
      });

      it('should NOT request game end if moves end the game', async () => {
        await expect(
          lobby.requestGameEndWithTimeout(gameId, winMoves, ...(await signMovesForBoth(gameId, winMoves))),
        ).to.be.revertedWith('!in progress');
      });

      it('should NOT request game end if signatures are invalid', async () => {
        const [sig0, sig1] = await signMovesForBoth(gameId, moves);
        await expect(lobby.requestGameEndWithTimeout(gameId, moves, randomSig, sig1)).to.be.revertedWith(
          `custom error 'BadSignature("${player0}")'`,
        );
        await expect(lobby.requestGameEndWithTimeout(gameId, moves, sig0, randomSig)).to.be.revertedWith(
          `custom error 'BadSignature("${player1}")'`,
        );
      });
    });

    describe('#cancelGameEndWithTimeoutRequest', () => {
      let moves: Move[];
      let moreMoves: Move[];
      snapshottedBeforeEach(async () => {
        moves = [
          { player: player0, i: 0, j: 0 },
          { player: player1, i: 0, j: 1 },
        ];
        moreMoves = [...moves, { player: player0, i: 0, j: 2 }];
        const sig0 = await signMoves(player0Account, gameId, moves.slice(0, -1));
        const sig1 = await signMoves(player1Account, gameId, moves);
        await lobby.connect(player1Account).requestGameEndWithTimeout(gameId, moves, sig1, sig0);
      });

      it('should cancel request and save the latest move to the state', async () => {
        await lobby.cancelGameEndWithTimeoutRequest(gameId, moreMoves, ...(await signMovesForBoth(gameId, moreMoves)));
        const req = await lobby.getEndGameWithTimeoutRequest(gameId);
        expect(req.requester).to.eq(player0);
        expect(req.kind).to.eq(REQUEST_CANCEL_END_GAME);
        expect(req.createdAt).to.eq(await getBlockTimestamp());
        expectMoveEqual(req.move, moreMoves[moreMoves.length - 1]);
        expect(req.signature).to.eq(await signMoves(player0Account, gameId, moreMoves));
      });

      it('should NOT cancel request if not provided with a new move', async () => {
        await expect(
          lobby.cancelGameEndWithTimeoutRequest(gameId, moves, ...(await signMovesForBoth(gameId, moves))),
        ).to.be.revertedWith('move not provided');
      });

      it('should NOT cancel request if new move ends the game', async () => {
        await expect(
          lobby.cancelGameEndWithTimeoutRequest(gameId, winMoves, ...(await signMovesForBoth(gameId, winMoves))),
        ).to.be.revertedWith('!in progress');
      });

      it('should NOT cancel request if signature is invalid', async () => {
        const [sig0, sig1] = await signMovesForBoth(gameId, moreMoves);
        await expect(lobby.cancelGameEndWithTimeoutRequest(gameId, moreMoves, randomSig, sig1)).to.be.revertedWith(
          `custom error 'BadSignature("${player0}")'`,
        );
        await expect(lobby.cancelGameEndWithTimeoutRequest(gameId, moreMoves, sig0, randomSig)).to.be.revertedWith(
          `custom error 'BadSignature("${player1}")'`,
        );
      });
    });
  });

  describe('#validateMoves', () => {
    let gameId: BigNumberish;
    snapshottedBeforeEach(async () => {
      gameId = await startGame(player0Account, player1Account);
    });

    it('should accept empty moves', async () => {
      const [sig0, sig1] = await signMovesForBoth(gameId, []);
      await lobby.validateMoves(gameId, [], sig0, sig1); // OK
    });
  });

  describe('#validateMsgSender', () => {
    let gameId: BigNumberish;
    snapshottedBeforeEach(async () => {
      gameId = await startGame(player0Account, player1Account);
    });

    it('should return players in correct order', async () => {
      let [p0, p1] = await lobby.validateMsgSender(gameId);
      expect(p0).to.eq(player0);
      expect(p1).to.eq(player1);
      [p1, p0] = await lobby.connect(player1Account).validateMsgSender(gameId);
      expect(p0).to.eq(player0);
      expect(p1).to.eq(player1);
    });

    it('should NOT return players if msg.sender is not in the game', async () => {
      await expect(lobby.connect(player2Account).validateMsgSender(gameId)).to.be.revertedWith('!player');
    });
  });

  describe('win combinations', () => {
    let gameId: BigNumberish;
    snapshottedBeforeEach(async () => {
      gameId = await startGame(player0Account, player1Account);
    });

    // i, j indices, alternating by player
    const combs = [
      // Horizontals
      [
        [0, 0],
        [1, 1], // other
        [0, 1],
        [2, 2], // other
        [0, 2],
      ],
      [
        [1, 0],
        [0, 0], // other
        [1, 1],
        [0, 1], // other
        [1, 2],
      ],
      [
        [2, 0],
        [0, 1], // other
        [2, 1],
        [0, 2], // other
        [2, 2],
      ],
      // Verticals
      [
        [0, 0],
        [0, 1], // other
        [1, 0],
        [0, 2], // other
        [2, 0],
      ],
      [
        [0, 1],
        [0, 0], // other
        [1, 1],
        [0, 2], // other
        [2, 1],
      ],
      [
        [0, 2],
        [0, 0], // other
        [1, 2],
        [0, 1], // other
        [2, 2],
      ],
      // Diagonals
      [
        [0, 0],
        [0, 1], // other
        [1, 1],
        [0, 2], // other
        [2, 2],
      ],
      [
        [0, 2],
        [0, 0], // other
        [1, 1],
        [0, 1], // other
        [2, 0],
      ],
    ];
    for (const comb of combs) {
      it(`should accept valid win combination: ${comb}`, async () => {
        const moves = comb.map(([i, j], index) => ({ player: index % 2 == 0 ? player0 : player1, i, j }));
        const [sig0, sig1] = await signMovesForBoth(gameId, moves);
        await lobby.endGameWithMoves(gameId, moves, sig0, sig1);
        const game = await lobby.getGame(gameId);
        expect(game.result).to.eq(WON);
        expect(game.winner).to.eq(player0);
      });
    }

    it('should register a draw', async () => {
      const [sig0, sig1] = await signMovesForBoth(gameId, drawMoves);
      await lobby.endGameWithMoves(gameId, drawMoves, sig0, sig1);
      const game = await lobby.getGame(gameId);
      expect(game.result).to.eq(DRAW);
      expect(game.winner).to.eq(AddressZero);
    });

    it('should NOT accept invalid win combination', async () => {
      const moves = [
        { player: player0, i: 0, j: 0 },
        { player: player1, i: 0, j: 1 },
        { player: player0, i: 0, j: 2 },
        { player: player1, i: 1, j: 0 },
      ];
      const [sig0, sig1] = await signMovesForBoth(gameId, moves);
      await expect(lobby.endGameWithMoves(gameId, moves, sig0, sig1)).to.be.revertedWith('!end');
    });
  });
});
