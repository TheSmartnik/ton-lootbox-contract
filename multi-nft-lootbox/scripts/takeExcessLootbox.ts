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

    await lootbox.sendTakeExcess(provider.sender(), toNano('0.01'));

    ui.clearActionPrompt();
    ui.write('Request to take excess was sent');
}
