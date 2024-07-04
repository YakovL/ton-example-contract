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

    // public methods
    async getBalance(provider: ContractProvider) {
        const state = await provider.getState();
        return state.balance;
    }

    // sendBet_ is only used in tests
    async sendBet_(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0, 32) // op == 0 for bet
                // ? when we need to send query id?
                .endCell(),
        })
    }
    async sendBet(provider: ContractProvider, via: Sender) {
        await this.sendBet_(provider, via, Lottery.fixedStake);
    }
}
