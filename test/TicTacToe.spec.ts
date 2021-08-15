import { BigNumberish } from '@ethersproject/bignumber';
import { arrayify } from '@ethersproject/bytes';
import { AddressZero } from '@ethersproject/constants';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { TicTacToe } from '../typechain';

interface Move {
  player: string;
  i: BigNumberish;
  j: BigNumberish;
}

const IN_PROGRESS = 0;
const WON = 1;
const DRAW = 2;

describe('TicTacToe', () => {
  let player0Account: SignerWithAddress, player1Account: SignerWithAddress, player2Account: SignerWithAddress;
  let player0: string, player1: string, player2: string;
  let lobby: TicTacToe;
  let drawMoves: Move[];
  before(async () => {
    [player0Account, player1Account, player2Account] = await ethers.getSigners();
    [player0, player1, player2] = [player0Account, player1Account, player2Account].map((acc) => acc.address);

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
  });

  beforeEach(async () => {
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

  async function signWinner(signer: SignerWithAddress, gameId: BigNumberish, result: BigNumberish, winner: string) {
    return await signer.signMessage(arrayify(await lobby.encodeWinner(gameId, result, winner)));
  }

  async function startGame(acc0: SignerWithAddress, acc1: SignerWithAddress) {
    const sig0 = await signGameStart(acc0, acc0.address, AddressZero);
    const sig1 = await signGameStart(acc1, acc0.address, acc1.address);
    return await lobby.startGame(acc0.address, acc1.address, sig0, sig1);
  }

  async function endGame(gameId: BigNumberish) {
    const sig0 = await signWinner(player0Account, gameId, DRAW, AddressZero);
    const sig1 = await signWinner(player1Account, gameId, DRAW, AddressZero);
    await lobby.endGameWithWinner(gameId, DRAW, AddressZero, sig0, sig1);
  }

  describe('constructor', () => {
    it('should have correct info', async () => {
      expect(await lobby.IN_PROGRESS()).to.eq(IN_PROGRESS);
      expect(await lobby.DRAW()).to.eq(DRAW);
      expect(await lobby.WON()).to.eq(WON);
      expect(await lobby.SIZE()).to.eq(3);
    });
  });

  describe('#startGame', () => {
    it('should create a game object', async () => {
      const sig0 = await signGameStart(player0Account, player0, AddressZero);
      const sig1 = await signGameStart(player1Account, player0, player1);
      await lobby.startGame(player0, player1, sig0, sig1);
      const gameId = await lobby.getGameId(player0);
      const game = await lobby.getGame(gameId);
      expect(game.player0).to.eq(player0);
      expect(game.player1).to.eq(player1);
      expect(game.result).to.eq(IN_PROGRESS);
      expect(game.winner).to.eq(AddressZero);
    });

    it('should NOT create a game if signatures are invalid', async () => {
      const sig0 = await signGameStart(player0Account, player0, AddressZero);
      const sig1 = await signGameStart(player1Account, player1, player0);
      await expect(lobby.startGame(player0, player1, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
      await expect(lobby.startGame(player1, player0, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
    });

    it('should NOT create a game with themselves', async () => {
      await expect(startGame(player0Account, player0Account)).to.be.revertedWith('same address');
    });

    it('should NOT allow two games for the same user simultaneously', async () => {
      await startGame(player0Account, player1Account);
      await expect(startGame(player0Account, player1Account)).to.be.revertedWith('already playing');
      await expect(startGame(player0Account, player2Account)).to.be.revertedWith('already playing');
      await expect(startGame(player1Account, player2Account)).to.be.revertedWith('already playing');
      await expect(startGame(player2Account, player1Account)).to.be.revertedWith('already playing');
    });

    it('should allow to play again after game is finished', async () => {
      await startGame(player0Account, player1Account);
      const gameId = await lobby.getGameId(player0);
      await expect(startGame(player0Account, player1Account)).to.be.revertedWith('already playing');
      await endGame(gameId);
      await startGame(player0Account, player1Account); // OK
    });
  });

  describe('#getGameId', () => {
    it('should create the same game ID for both players', async () => {
      await startGame(player0Account, player1Account);
      expect(await lobby.getGameId(player0)).to.eq(await lobby.getGameId(player1));
    });

    it('should create different game IDs for different games', async () => {
      await startGame(player0Account, player1Account);
      const gameId = await lobby.getGameId(player0);
      await endGame(gameId);
      await startGame(player0Account, player1Account);
      expect(await lobby.getGameId(player0)).to.not.eq(gameId);
    });
  });

  describe('#endGameWithMoves', () => {
    let gameId: BigNumberish;
    let validMoves: Move[];
    beforeEach(async () => {
      await startGame(player0Account, player1Account);
      gameId = await lobby.getGameId(player0);
      validMoves = [
        { player: player0, i: 0, j: 0 },
        { player: player1, i: 1, j: 0 },
        { player: player0, i: 0, j: 1 },
        { player: player1, i: 1, j: 1 },
        { player: player0, i: 0, j: 2 },
      ];
    });

    it('should end a game with valid moves', async () => {
      const sig0 = await signMoves(player0Account, gameId, validMoves);
      const sig1 = await signMoves(player1Account, gameId, validMoves.slice(0, validMoves.length - 1));
      await lobby.endGameWithMoves(gameId, validMoves, sig0, sig1);
      const game = await lobby.getGame(gameId);
      expect(game.result).to.eq(WON);
      expect(game.winner).to.eq(player0);
    });

    it('should NOT end the game with invalid winner signature', async () => {
      const sig0 = await signMoves(player0Account, gameId, validMoves.slice(0, 1));
      const sig1 = await signMoves(player1Account, gameId, validMoves.slice(0, validMoves.length - 1));
      await expect(lobby.endGameWithMoves(gameId, validMoves, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player0}")'`,
      );
    });

    it('should NOT end the game with invalid loser signature', async () => {
      const sig0 = await signMoves(player0Account, gameId, validMoves);
      const sig1 = await signMoves(player1Account, gameId, validMoves);
      await expect(lobby.endGameWithMoves(gameId, validMoves, sig0, sig1)).to.be.revertedWith(
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
      const [sig0, sig1] = await signMovesForBoth(gameId, validMoves);
      await lobby.endGameWithMoves(gameId, validMoves, sig0, sig1);
      await expect(lobby.endGameWithMoves(gameId, validMoves, sig0, sig1)).to.be.revertedWith('game ended');
    });

    it('should NOT allow to end the game after a draw', async () => {
      const [sig0, sig1] = await signMovesForBoth(gameId, drawMoves);
      await lobby.endGameWithMoves(gameId, drawMoves, sig0, sig1);
      await expect(lobby.endGameWithMoves(gameId, drawMoves, sig0, sig1)).to.be.revertedWith('game ended');
    });
  });

  describe('#endGameWithWinner', () => {
    let gameId: BigNumberish;
    beforeEach(async () => {
      await startGame(player0Account, player1Account);
      gameId = await lobby.getGameId(player0);
    });

    it('should end the game with valid signatures and the same winner', async () => {
      const sig0 = await signWinner(player0Account, gameId, WON, player0);
      const sig1 = await signWinner(player1Account, gameId, WON, player0);
      await lobby.endGameWithWinner(gameId, WON, player0, sig0, sig1);
      const game = await lobby.getGame(gameId);
      expect(game.result).to.eq(WON);
      expect(game.winner).to.eq(player0);
    });

    it('should end the game with draw result', async () => {
      const sig0 = await signWinner(player0Account, gameId, DRAW, AddressZero);
      const sig1 = await signWinner(player1Account, gameId, DRAW, AddressZero);
      await lobby.endGameWithWinner(gameId, DRAW, AddressZero, sig0, sig1);
      const game = await lobby.getGame(gameId);
      expect(game.result).to.eq(DRAW);
      expect(game.winner).to.eq(AddressZero);
    });

    it('should NOT end the game with different winner', async () => {
      const sig0 = await signWinner(player0Account, gameId, WON, player0);
      const sig1 = await signWinner(player1Account, gameId, WON, player1);
      await expect(lobby.endGameWithWinner(gameId, WON, player0, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
      await expect(lobby.endGameWithWinner(gameId, WON, player1, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player0}")'`,
      );
    });

    it('should NOT end the game with invalid signatures', async () => {
      const sig0 = await signWinner(player0Account, gameId, WON, player0);
      const sig1 = await signWinner(player1Account, gameId, WON, player0);
      await expect(lobby.endGameWithWinner(gameId, WON, player0, sig0, sig0)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
      await expect(lobby.endGameWithWinner(gameId, WON, player0, sig1, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player0}")'`,
      );
    });

    it('should NOT end the game with draw result and non-zero address', async () => {
      const sig0 = await signWinner(player0Account, gameId, DRAW, player0);
      const sig1 = await signWinner(player1Account, gameId, DRAW, player0);
      await expect(lobby.endGameWithWinner(gameId, DRAW, player0, sig0, sig1)).to.be.revertedWith('!address(0)');
    });

    it('should NOT end the game after win', async () => {
      const sig0 = await signWinner(player0Account, gameId, WON, player0);
      const sig1 = await signWinner(player1Account, gameId, WON, player0);
      await lobby.endGameWithWinner(gameId, WON, player0, sig0, sig1);
      await expect(lobby.endGameWithWinner(gameId, WON, player0, sig0, sig1)).to.be.revertedWith('game ended');
    });

    it('should NOT end the game after draw', async () => {
      const sig0 = await signWinner(player0Account, gameId, DRAW, AddressZero);
      const sig1 = await signWinner(player1Account, gameId, DRAW, AddressZero);
      await lobby.endGameWithWinner(gameId, DRAW, AddressZero, sig0, sig1);
      await expect(lobby.endGameWithWinner(gameId, DRAW, AddressZero, sig0, sig1)).to.be.revertedWith('game ended');
    });
  });

  describe('#validateMoves', () => {
    let gameId: BigNumberish;
    beforeEach(async () => {
      await startGame(player0Account, player1Account);
      gameId = await lobby.getGameId(player0);
    });

    it('should accept empty moves', async () => {
      const [sig0, sig1] = await signMovesForBoth(gameId, []);
      await lobby.validateMoves(gameId, [], sig0, sig1); // OK
    });
  });

  describe('win combinations', () => {
    let gameId: BigNumberish;
    beforeEach(async () => {
      await startGame(player0Account, player1Account);
      gameId = await lobby.getGameId(player0);
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
