import {
    Address,
    Cell, beginCell,
    Contract, contractAddress, ContractProvider,
    Sender, SendMode,
    toNano,
} from '@ton/core';

export type LotteryConfig = {};

export function lotteryConfigToCell(config: LotteryConfig): Cell {
    return beginCell().endCell();
}

export class Lottery implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Lottery(address);
    }

    static createFromConfig(config: LotteryConfig, code: Cell, workchain = 0) {
        const data = lotteryConfigToCell(config);
        const init = { code, data };
        return new Lottery(contractAddress(workchain, init), init);
    }

    // WET: must be equal to fixed_stake in the contract
    static readonly fixedStake = toNano('1');

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }
}
