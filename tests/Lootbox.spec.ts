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

let create_content = (content: String): Cell => (beginCell().storeBuffer(Buffer.from(content))).endCell();

let chancesWithContent = {
   10: create_content('ipfs://long_string/1.jpg'),
   20: create_content('ipfs://long_string/2.jpg'),
   30: create_content('ipfs://long_string/3.jpg'),
   40: create_content('ipfs://long_string/4.jpg'),
   50: create_content('ipfs://long_string/5.jpg'),
   60: create_content('ipfs://long_string/6.jpg'),
   70: create_content('ipfs://long_string/7.jpg'),
   80: create_content('ipfs://long_string/8.jpg'),
   95: create_content('ipfs://long_string/9.jpg'),
   100: create_content('ipfs://long_string/10.jpg')
}

const defaultConfig: LootboxConfig = {
    nextItemIndex: 3,
    owner: OWNER_ADDRESS,
    content: contentCell,
    royaltyParams: royaltyCell,
    chancesWithContent: chancesWithContent
}

describe('Helpful Hints', () => {
    it('prints hint with chances and content', async () => {
        let expectedOutput = `| Chance | Content
|    10% | ipfs://long_string/1.jpg
|    10% | ipfs://long_string/2.jpg
|    10% | ipfs://long_string/3.jpg
|    10% | ipfs://long_string/4.jpg
|    10% | ipfs://long_string/5.jpg
|    10% | ipfs://long_string/6.jpg
|    10% | ipfs://long_string/7.jpg
|    10% | ipfs://long_string/8.jpg
|    15% | ipfs://long_string/9.jpg
|     5% | ipfs://long_string/10.jpg`

        let hint = Lootbox.printChancesFromCOnfig(defaultConfig);

        expect(hint).toEqual(expectedOutput)
    })
});

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
        let expectedItemAddress = await lootbox.getItemAddress(3)
        let result = await lootbox.sendMint(deployer.getSender(), NFT_OWNER_ADDRESS, { value: toNano('0.05') })

        expect(result.transactions).toHaveTransaction({ from: lootbox.address, success: true, to: expectedItemAddress })
        const lastTransaction = result.transactions[2]
        const messageBody = lastTransaction.inMessage!.body.beginParse()

        expect(messageBody.loadAddress().toString()).toEqual(NFT_OWNER_ADDRESS.toString())
        let nftContent = messageBody.loadStringRefTail()
        expect(nftContent).toMatch(/ipfs:\/\/long_string\/\d*\.jpg/)
        console.log(nftContent);
    })
});
