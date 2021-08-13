import { arrayify } from '@ethersproject/bytes';
import { AddressZero } from '@ethersproject/constants';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';
import { TicTacToe } from '../typechain';

interface Move {
  player: string;
  i: number;
  j: number;
}

describe('TicTacToe', () => {
  let player0Account: SignerWithAddress, player1Account: SignerWithAddress;
  let player0: string, player1: string;
  let lobby: TicTacToe;
  beforeEach(async () => {
    [player0Account, player1Account] = await ethers.getSigners();
    [player0, player1] = [player0Account, player1Account].map((acc) => acc.address);

    lobby = await (await ethers.getContractFactory('TicTacToe')).deploy();
  });

  describe('#startGame', () => {
    it('should create a game object', async () => {
      await lobby.startGame(player0, player1);
      const game = await lobby.getGame(0);
      expect(game.player0).to.eq(player0);
      expect(game.player1).to.eq(player1);
      expect(game.winner).to.eq(AddressZero);
    });
  });

  describe('#endGameWithMoves', () => {
    let gameId: number;
    let validMoves: Move[];
    beforeEach(async () => {
      await lobby.startGame(player0, player1);
      expect(await lobby.gamesLength()).to.eq(1); // sanity check
      gameId = 0;
      validMoves = [
        { player: player0, i: 0, j: 0 },
        { player: player1, i: 1, j: 0 },
        { player: player0, i: 0, j: 1 },
        { player: player1, i: 1, j: 1 },
        { player: player0, i: 0, j: 2 },
      ];
    });

    async function signMoves(signer: SignerWithAddress, gameId: number, moves: Move[]) {
      return await signer.signMessage(arrayify(await lobby.encodeMoves(gameId, moves)));
    }

    async function signMovesForBoth(gameId: number, moves: Move[]) {
      return await Promise.all([
        signMoves(player0Account, gameId, moves),
        signMoves(player1Account, gameId, moves.slice(0, moves.length - 1)),
      ]);
    }

    it('should end a game with valid moves', async () => {
      const sig0 = await signMoves(player0Account, gameId, validMoves);
      const sig1 = await signMoves(player1Account, gameId, validMoves.slice(0, validMoves.length - 1));
      await lobby.endGameWithMoves(gameId, validMoves, sig0, sig1);
      expect((await lobby.getGame(gameId)).winner).to.eq(player0);
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
  });

  describe('#endGameWithWinner', () => {
    let gameId: number;
    beforeEach(async () => {
      await lobby.startGame(player0, player1);
      expect(await lobby.gamesLength()).to.eq(1); // sanity check
      gameId = 0;
    });

    async function signWinner(signer: SignerWithAddress, winner: string) {
      return await signer.signMessage(arrayify(await lobby.encodeWinner(gameId, winner)));
    }

    it('should end the game with valid signatures and the same winner', async () => {
      const sig0 = await signWinner(player0Account, player0);
      const sig1 = await signWinner(player1Account, player0);
      await lobby.endGameWithWinner(gameId, player0, sig0, sig1);
      expect((await lobby.getGame(gameId)).winner).to.eq(player0);
    });

    it('should NOT end the game with different winner', async () => {
      const sig0 = await signWinner(player0Account, player0);
      const sig1 = await signWinner(player1Account, player1);
      await expect(lobby.endGameWithWinner(gameId, player0, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
      await expect(lobby.endGameWithWinner(gameId, player1, sig0, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player0}")'`,
      );
    });

    it('should NOT end the game with invalid signatures', async () => {
      const sig0 = await signWinner(player0Account, player0);
      const sig1 = await signWinner(player1Account, player0);
      await expect(lobby.endGameWithWinner(gameId, player0, sig0, sig0)).to.be.revertedWith(
        `custom error 'BadSignature("${player1}")'`,
      );
      await expect(lobby.endGameWithWinner(gameId, player0, sig1, sig1)).to.be.revertedWith(
        `custom error 'BadSignature("${player0}")'`,
      );
    });

    it('should NOT end the game if the game is already ended', async () => {
      const sig0 = await signWinner(player0Account, player0);
      const sig1 = await signWinner(player1Account, player0);
      await lobby.endGameWithWinner(gameId, player0, sig0, sig1);
      await expect(lobby.endGameWithWinner(gameId, player0, sig0, sig1)).to.be.revertedWith('game ended');
    });
  });
});
