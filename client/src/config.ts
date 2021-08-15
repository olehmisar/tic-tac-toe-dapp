import { address as localhostTicTacToeAddress } from '../../deployments/localhost/TicTacToe.json';
import { address as rinkebyTicTacToeAddress } from '../../deployments/rinkeby/TicTacToe.json';

const LOCALHOST_ID = 1337;
const RINKEBY_ID = 4;

export default {
  addresses: {
    [LOCALHOST_ID]: {
      TicTacToe: localhostTicTacToeAddress,
    },
    [RINKEBY_ID]: {
      TicTacToe: rinkebyTicTacToeAddress,
    },
  },
};
