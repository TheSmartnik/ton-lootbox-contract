import { toNano } from 'ton-core';
import { Lootbox } from '../wrappers/Lootbox';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const lootbox = provider.open(Lootbox.createFromConfig({}, await compile('Lootbox')));

    await lootbox.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(lootbox.address);

    // run methods on `lootbox`
}
