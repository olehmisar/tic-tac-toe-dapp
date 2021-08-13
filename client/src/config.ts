import { address as localhostTicTacToeAddress } from '../../deployments/localhost/TicTacToe.json';

const LOCALHOST_ID = 1337;

export default {
  addresses: {
    [LOCALHOST_ID]: {
      TicTacToe: localhostTicTacToeAddress,
    },
  },
};
