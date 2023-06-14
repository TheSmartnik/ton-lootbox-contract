import { Blockchain, SandboxContract } from '@ton-community/sandbox';
import { Cell, beginCell, toNano } from 'ton-core';
import { Lootbox, LootboxConfig, RoyaltyData } from '../wrappers/Lootbox';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { randomAddress } from "@ton-community/test-utils";

const OWNER_ADDRESS = randomAddress()
const ROYALTY_ADDRESS = randomAddress()

const contentCell = beginCell().storeRef(new Cell()).storeRef(new Cell()).endCell()
const royaltyCell = beginCell().storeUint(5, 16).storeUint(10, 16).storeAddress(ROYALTY_ADDRESS).endCell()
const defaultConfig: LootboxConfig = {
    owner: OWNER_ADDRESS,
    nextItemIndex: 1,
    content: contentCell,
    royaltyParams: royaltyCell
}

describe('Lootbox', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Lootbox');
    });

    let blockchain: Blockchain;
    let lootbox: SandboxContract<Lootbox>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        lootbox = blockchain.openContract(
            Lootbox.createFromConfig(defaultConfig, Lootbox.code)
        );

        const deployer = await blockchain.treasury('deployer');

        const result = await lootbox.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: lootbox.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and lootbox are ready to use
    });

    describe('get methods', () => {
        it('should return royalty params', async () => {
            let ressult = await lootbox.getRoyaltyParams()

            expect(ressult.royaltyFactor).toEqual(5)
            expect(ressult.royaltyBase).toEqual(10)
            expect(ressult.royaltyAddress.toString()).toEqual(ROYALTY_ADDRESS.toString())
        });
    });

    it('should mint', async () => {
        const deployer = await blockchain.treasury('deployer');

        let result = await lootbox.sendMint(deployer.getSender(), lootbox.address, { value: toNano('0.05') });

        expect(result.transactions).toHaveTransaction({ from: lootbox.address, success: true });
    })
});
