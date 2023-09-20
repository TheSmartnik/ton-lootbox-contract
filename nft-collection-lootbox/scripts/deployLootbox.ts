import { toNano, Address, Cell, beginCell, Dictionary } from 'ton-core';
import { Lootbox, chancesWithContent } from '../wrappers/Lootbox';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { readFileSync } from 'fs';

let create_content = (content: String): Cell => (beginCell().storeBuffer(Buffer.from(content))).endCell();

const path = process.env.CHANCES_WITH_CONTENT_PATH;
if (!path) {
    throw("Please provide a path to chances with content via CHANCES_WITH_CONTENT_PATH env variable")
}
const fileContent = readFileSync(path).toString('utf-8');
const chancesWithContentJson = JSON.parse(fileContent);
const chancesWithContent = Object.keys(chancesWithContentJson).reduce((memo: chancesWithContent, key) => {
   memo[key] = create_content(chancesWithContentJson[key])

   return memo;
}, {})

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const ownerAddress = provider.sender?.().address;

    if (!ownerAddress) { throw "Can't fetch owner address" }

    const content = await ui.input('Press provide a link to a collection content');
    const collectionContent = create_content(content);

    const commonCollectionContent = new Cell()
    const collectionContentCell = beginCell().storeRef(collectionContent).storeRef(commonCollectionContent).endCell()

    const config = {
        nextItemIndex: 0,
        owner: ownerAddress,
        content: collectionContentCell,
        royaltyParams: new Cell(),
        chancesWithContent: chancesWithContent
    }

    ui.write(`Using file: ${path}\nHere are the expected chances of the lootbox`)
    ui.write(`Here is the expected chances for lootbox`)
    ui.write(Lootbox.printChancesFromConfig(config))

    await ui.prompt('Press enter to continue deploy');

    const lootbox = provider.open(
        Lootbox.createFromConfig(config, await compile('Lootbox'))
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
