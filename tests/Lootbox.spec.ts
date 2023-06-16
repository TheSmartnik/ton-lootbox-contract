import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Cell, beginCell, toNano, Dictionary } from 'ton-core';
import { Lootbox, LootboxConfig, RoyaltyData } from '../wrappers/Lootbox';
import { NftItem } from '../wrappers/NftItem';

import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { randomAddress } from "@ton-community/test-utils";

const OWNER_ADDRESS = randomAddress()
const ROYALTY_ADDRESS = randomAddress()
const NFT_OWNER_ADDRESS = randomAddress()

const contentCell = beginCell().storeRef(new Cell()).storeRef(new Cell()).endCell()
const royaltyCell = beginCell().storeUint(5, 16).storeUint(10, 16).storeAddress(ROYALTY_ADDRESS).endCell()

let contentsCell = Dictionary.empty<number, Cell>();
let create_content = (content: String): Cell => (beginCell().storeBuffer(Buffer.from(content))).endCell();

contentsCell.set(0, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/0.jpg'));
contentsCell.set(1, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/1.jpg'));
contentsCell.set(2, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/2.jpg'));
contentsCell.set(3, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/3.jpg'));
contentsCell.set(4, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/4.jpg'));
contentsCell.set(5, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/5.jpg'));
contentsCell.set(6, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/6.jpg'));
contentsCell.set(7, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/7.jpg'));
contentsCell.set(8, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/8.jpg'));
contentsCell.set(9, create_content('ipfs://bafybeiehhitjaarz6jwfyun5kspdzwczr6trzd5zqs23nu5kujgfyrpiuu/9.jpg'));

const chancesCell = beginCell()
    .storeUint(10, 16)
    .storeUint(15, 16)
    .storeUint(25, 16)
    .storeUint(35, 16)
    .storeUint(45, 16)
    .storeUint(55, 16)
    .storeUint(65, 16)
    .storeUint(75, 16)
    .storeUint(85, 16)
    .storeUint(95, 16)
    .endCell();

const lootboxContent = beginCell()
    .storeRef(chancesCell)
    .storeDict(contentsCell, Dictionary.Keys.Uint(16), Dictionary.Values.Cell())
    .endCell()


const defaultConfig: LootboxConfig = {
    nextItemIndex: 3,
    owner: OWNER_ADDRESS,
    content: contentCell,
    royaltyParams: royaltyCell,
    lootboxContent: lootboxContent
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
            Lootbox.createFromConfig(defaultConfig, code)
        );

        const result = await lootbox.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(result.transactions).toHaveTransaction({
            from: deployer.address,
            to: lootbox.address,
            deploy: true,
            success: true,
        });
    });

    xit('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and lootbox are ready to use
    });

    describe('get methods', () => {
        xit('should return royalty params', async () => {
            let ressult = await lootbox.getRoyaltyParams()

            expect(ressult.royaltyFactor).toEqual(5)
            expect(ressult.royaltyBase).toEqual(10)
            expect(ressult.royaltyAddress.toString()).toEqual(ROYALTY_ADDRESS.toString())
        });
    });

    it('should mint', async () => {
        let expectedItemAddress = await lootbox.getItemAddress(3);
        let result = await lootbox.sendMint(deployer.getSender(), NFT_OWNER_ADDRESS, { value: toNano('0.05') });

        expect(result.transactions).toHaveTransaction({ from: lootbox.address, success: true, to: expectedItemAddress });

    })
});
