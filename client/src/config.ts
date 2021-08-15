import _ from 'lodash';
import deployments from './deployments.json';

const LOCALHOST_ID = 1337;
const RINKEBY_ID = 4;

export default {
  addresses: {
    [LOCALHOST_ID]: {
      TicTacToe: _.get(deployments, '1337.localhost.contracts.TicTacToe.address'),
    },
    [RINKEBY_ID]: {
      TicTacToe: deployments['4'].rinkeby.contracts.TicTacToe.address,
    },
  },
};
