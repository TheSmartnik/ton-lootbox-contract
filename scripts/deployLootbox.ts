import { toNano, Address, Cell, beginCell, Dictionary } from 'ton-core';
import { Lootbox } from '../wrappers/Lootbox';
import { compile, NetworkProvider } from '@ton-community/blueprint';

const OWNER_ADDRESS = Address.parse('');
const NUMBER_OF_CHANCES = 3;

let create_content = (content: String): Cell => (beginCell().storeBuffer(Buffer.from(content))).endCell();

let contentsCell = Dictionary.empty<number, Cell>();
contentsCell.set(0, create_content('ipfs://long_string/1.jpg'))
contentsCell.set(70, create_content('ipfs://long_string/2.jpg'))
contentsCell.set(95, create_content('ipfs://long_string/3.jpg'))

let chancesWithContent = {
   70: create_content('ipfs://long_string/1.jpg'),
   95: create_content('ipfs://long_string/2.jpg'),
   100: create_content('ipfs://long_string/3.jpg'),
}

const collectionContent = create_content('');
const commonCollectionContent = new Cell()
const collectionContentCell = beginCell().storeRef(collectionContent).storeRef(commonCollectionContent).endCell()

export async function run(provider: NetworkProvider) {
    const lootbox = provider.open(
        Lootbox.createFromConfig(
            {
                nextItemIndex: 0,
                owner: OWNER_ADDRESS,
                content: collectionContentCell,
                royaltyParams: new Cell(),
                chancesWithContent: chancesWithContent
            },
            await compile('Lootbox')
        )
    );

    await lootbox.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(lootbox.address);

    console.log('Address', await lootbox.address);
}
