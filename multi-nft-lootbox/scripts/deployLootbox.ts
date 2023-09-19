import { toNano, Address, Cell, beginCell, Dictionary } from 'ton-core';
import { Lootbox, chancesWithAddresses } from '../wrappers/Lootbox';
import { compile, NetworkProvider } from '@ton-community/blueprint';
import { readFileSync } from 'fs';

const path = process.env.CHANCES_WITH_ADDRESSES_PATH;
if (!path) {
    throw("Please provide a path to chances with content via CHANCES_WITH_ADDRESSES_PATH env variable")
}
const fileContent = readFileSync(path).toString('utf-8');
const chancesWithAddressesJson = JSON.parse(fileContent);
const chancesWithAddresses = Object.keys(chancesWithAddressesJson).reduce((memo: chancesWithAddresses, key) => {
   memo[key] = Address.parse(chancesWithAddressesJson[key])

   return memo;
}, {})

export async function run(provider: NetworkProvider) {
    const ui = provider.ui();

    const ownerAddress = provider.sender?.().address;

    if (!ownerAddress) { throw "Can't fetch owner address" }

    const price = await ui.input('Press enter lootbox price');

    const config = {
        price: toNano(price),
        owner: ownerAddress,
        chancesWithAddresses: chancesWithAddresses
    }

    ui.write(`Price for lootbox is: ${price}\n`)

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
