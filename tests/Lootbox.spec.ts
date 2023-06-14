import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Cell, beginCell, toNano, Dictionary } from 'ton-core';
import { Lootbox, LootboxConfig, RoyaltyData } from '../wrappers/Lootbox';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { randomAddress } from "@ton-community/test-utils";

const OWNER_ADDRESS = randomAddress()
const ROYALTY_ADDRESS = randomAddress()

const contentCell = beginCell().storeRef(new Cell()).storeRef(new Cell()).endCell()
const royaltyCell = beginCell().storeUint(5, 16).storeUint(10, 16).storeAddress(ROYALTY_ADDRESS).endCell()

let chancesCell = Dictionary.empty<number, Cell>();
let create_content = (content: String) => (beginCell().storeBuffer(Buffer.from(content)).endCell());

chancesCell.set(10, create_content('ipfs://directory/10.png'));
chancesCell.set(20, create_content('ipfs://directory/20.png'));
chancesCell.set(30, create_content('ipfs://directory/30.png'));
chancesCell.set(40, create_content('ipfs://directory/40.png'));
chancesCell.set(50, create_content('ipfs://directory/50.png'));
chancesCell.set(60, create_content('ipfs://directory/60.png'));
chancesCell.set(70, create_content('ipfs://directory/70.png'));
chancesCell.set(80, create_content('ipfs://directory/80.png'));
chancesCell.set(90, create_content('ipfs://directory/90.png'));
chancesCell.set(100, create_content('ipfs://directory/100.png'));

const defaultConfig: LootboxConfig = {
    nextItemIndex: 3,
    owner: OWNER_ADDRESS,
    content: contentCell,
    royaltyParams: royaltyCell,
    chancesCell: chancesCell
}

describe('Lootbox', () => {
    let code: Cell;

    beforeAll(async () => {
        code = await compile('Lootbox');
    });

    let blockchain: Blockchain;
    let lootbox: SandboxContract<Lootbox>;
    let deployer: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        deployer = await blockchain.treasury('deployer');
        defaultConfig.owner = deployer.address;

        lootbox = blockchain.openContract(
            Lootbox.createFromConfig(defaultConfig, Lootbox.code)
        );

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
        let expectedItemAddress = await lootbox.getItemAddress(3);

        let result = await lootbox.sendMint(deployer.getSender(), lootbox.address, { value: toNano('0.05') });

        expect(result.transactions).toHaveTransaction({ from: lootbox.address, success: true, to: expectedItemAddress });
    })
});
