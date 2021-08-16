import { ethers } from 'hardhat';

export async function getBlockTimestamp() {
  return (await ethers.provider.getBlock('latest')).timestamp;
}

export async function evmIncreaseTime(offset: number) {
  await ethers.provider.send('evm_mine', [(await getBlockTimestamp()) + offset]);
}
