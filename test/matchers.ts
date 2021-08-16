import { expect } from 'chai';
import { Move } from './TicTacToe.spec';

export async function expectMoveEqual(a: Move, b: Move) {
  expect(a.player).to.eq(b.player);
  expect(a.i).to.eq(b.i);
  expect(a.j).to.eq(b.j);
}
