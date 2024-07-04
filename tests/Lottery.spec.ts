import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Cell, toNano } from '@ton/core';
import { Lottery } from '../wrappers/Lottery';
import '@ton/test-utils';
import { compile } from '@ton/blueprint';

describe('Lottery', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Lottery');
    });

    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let lottery: SandboxContract<Lottery>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        lottery = blockchain.openContract(Lottery.createFromConfig({}, code));

        deployer = await blockchain.treasury('deployer');

        const deployResult = await lottery.sendDeploy(deployer.getSender(), Lottery.fixedStake * 2n + toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: lottery.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and lottery are ready to use
    });

    it('should not bet when sending wrong amount', async () => {
        const wrongBetResult = await lottery.sendBet_(deployer.getSender(), Lottery.fixedStake + toNano('0.01'));
        expect(wrongBetResult.transactions).toHaveTransaction({
            inMessageBounced: true,
        });
    });

    it('should bet when sending correct amount', async () => {
        const correctBetResult = await lottery.sendBet_(deployer.getSender(), Lottery.fixedStake);
        expect(correctBetResult.transactions).not.toHaveTransaction({
            inMessageBounced: true,
        });
    });

    it('should either increase contract balance by approx. 1 and decrease sender balance by ~ or vise verse', async () => {
        // probably smaller; not sure if it's safe to test the specific amount in sandbox
        const expectedGasMargin = toNano('0.01');
        const expectedWinAmount = toNano('1');

        const senderBalanceBefore = await deployer.getBalance();
        const contractBalanceBefore = await lottery.getBalance();

        await lottery.sendBet(deployer.getSender());

        const senderBalanceAfter = await deployer.getBalance();
        const contractBalanceAfter = await lottery.getBalance();

        const senderBalanceChange = senderBalanceAfter - senderBalanceBefore;
        const senderBalanceChangeAbs = senderBalanceChange > 0n ? senderBalanceChange : -senderBalanceChange;
        expect(senderBalanceChangeAbs - expectedWinAmount).toBeLessThan(expectedGasMargin);
        expect(senderBalanceChangeAbs - expectedWinAmount).toBeGreaterThan(-expectedGasMargin);

        const contractBalanceChange = contractBalanceAfter - contractBalanceBefore;
        const contractBalanceChangeAbs = contractBalanceChange > 0n ? contractBalanceChange : -contractBalanceChange;
        expect(contractBalanceChangeAbs - expectedWinAmount).toBeLessThan(expectedGasMargin);
        expect(contractBalanceChangeAbs - expectedWinAmount).toBeGreaterThan(-expectedGasMargin);

        const balancesSumChange = senderBalanceChange + contractBalanceChange;
        expect(balancesSumChange).toBeLessThan(0n);
        expect(balancesSumChange).toBeGreaterThan(-expectedGasMargin - expectedGasMargin);
    });

    it('should just increase balance when a message with no op-code is sent', async () => {
        const senderBalanceBefore = await deployer.getBalance();
        const contractBalanceBefore = await lottery.getBalance();
        const amount = toNano('1.5')

        // no special method for sending funds, but sendDeploy does exactly that
        await lottery.sendDeploy(deployer.getSender(), amount);

        const senderBalanceAfter = await deployer.getBalance();
        const contractBalanceAfter = await lottery.getBalance();
        const contractRecieved = contractBalanceAfter - contractBalanceBefore;
        const senderSpent = senderBalanceBefore - senderBalanceAfter;

        // sender spends gas
        expect(senderSpent).toBeGreaterThan(amount);
        expect(senderSpent).toBeLessThan(amount + toNano('0.01'));

        // contract still spends gas to check in_msg_body.slice_empty?()
        expect(contractRecieved).toBeLessThan(amount);
        expect(contractRecieved).toBeGreaterThan(amount - toNano('0.01'));
    });
});
