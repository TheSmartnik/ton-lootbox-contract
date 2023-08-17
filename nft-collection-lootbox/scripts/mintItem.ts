import { toNano, Address } from 'ton-core';
import { Lootbox } from '../wrappers/Lootbox';
import { NetworkProvider, sleep } from '@ton-community/blueprint';

export async function run(provider: NetworkProvider, args: string[]) {
    const ui = provider.ui();

    const lootboxAddress = Address.parse(args.length > 0 ? args[0] : await ui.input('Provide lootbox address:'));

    if (!(await provider.isContractDeployed(lootboxAddress))) {
        ui.write(`Error: Contract at address ${lootboxAddress} is not deployed!`);
        ui.write('Run  npx blueprint run to deploy contract');
        return;
    }

    const lootbox = provider.open(Lootbox.createFromAddress(lootboxAddress));

    const lootboxData = await lootbox.getLootboxData();
    lootbox.setNextItemIndex(lootboxData.nextItemIndex);

    const itemAddress = await lootbox.getItemAddress(lootbox.nextItemIndex);
    await lootbox.sendMint(provider.sender());

    ui.write('Waiting for lootbox to mint the item...');

    let attempt = 1;
    while (!(await provider.isContractDeployed(lootboxAddress))) {
        ui.setActionPrompt(`Attempt ${attempt}`);
        await sleep(4000);
        attempt++;
    }

    ui.clearActionPrompt();
    ui.write(`Item was successfully minted: ${itemAddress}`);
}
