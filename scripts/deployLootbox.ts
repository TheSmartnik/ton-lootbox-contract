import { toNano, Address, Cell, beginCell, Dictionary } from 'ton-core';
import { Lootbox } from '../wrappers/Lootbox';
import { compile, NetworkProvider } from '@ton-community/blueprint';

let create_content = (content: String): Cell => (beginCell().storeBuffer(Buffer.from(content))).endCell();

let chancesWithContent = {
  40: create_content("https://gist.github.com/TheSmartnik/fc398bdc3ab7de5a68f9ed083a0099a8#file-item_1-json"),
  70: create_content("https://gist.github.com/TheSmartnik/fc398bdc3ab7de5a68f9ed083a0099a8#file-item_2-json"),
  90: create_content("https://gist.github.com/TheSmartnik/fc398bdc3ab7de5a68f9ed083a0099a8#file-item_3-json"),
  100: create_content("https://gist.github.com/TheSmartnik/fc398bdc3ab7de5a68f9ed083a0099a8#file-item_4-json")
}

const collectionContent = create_content('');
const commonCollectionContent = new Cell()
const collectionContentCell = beginCell().storeRef(collectionContent).storeRef(commonCollectionContent).endCell()

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const ownerAddress = provider.sender?.().address;

    if (!ownerAddress) { throw "Can't fetch owner address" }

    const lootbox = provider.open(

        Lootbox.createFromConfig(
            {
                nextItemIndex: 0,
                owner: ownerAddress,
                content: collectionContentCell,
                royaltyParams: new Cell(),
                chancesWithContent: chancesWithContent
            },
            await compile('Lootbox')
        )
    );

    const lootboxAddress = lootbox.address;
    if (await provider.isContractDeployed(lootboxAddress)) {
        ui.write(`Lootbox is already deployed\nAddress ${lootboxAddress}`)
    } else {
        await lootbox.sendDeploy(provider.sender(), toNano('0.05'));

        await provider.waitForDeploy(lootboxAddress);

        ui.write(`Address ${lootboxAddress}`)
    }
}
