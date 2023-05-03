import { toNano } from 'ton-core';
import { Lootbox } from '../wrappers/Lootbox';
import { compile, NetworkProvider } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider) {
    const lootbox = provider.open(
        Lootbox.createFromConfig(
            {
                id: Math.floor(Math.random() * 10000),
                counter: 0,
            },
            await compile('Lootbox')
        )
    );

    await lootbox.sendDeploy(provider.sender(), toNano('0.05'));

    await provider.waitForDeploy(lootbox.address);

    console.log('ID', await lootbox.getID());
}
