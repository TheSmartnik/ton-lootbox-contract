import { Blockchain, SandboxContract, TreasuryContract } from '@ton-community/sandbox';
import { Address, Cell, toNano } from 'ton-core';
import { Lootbox, LootboxConfig } from '../wrappers/Lootbox';
import '@ton-community/test-utils';
import { compile } from '@ton-community/blueprint';
import { randomAddress } from "@ton-community/test-utils";

const OWNER_ADDRESS = randomAddress()

let chancesWithAddresses = {
   15: randomAddress(),
   30: randomAddress(),
   45: randomAddress(),
   60: randomAddress(),
   70: randomAddress(),
   80: randomAddress(),
   93: randomAddress(),
   100: randomAddress()
}

const defaultConfig: LootboxConfig = {
    price: toNano('10'),
    owner: OWNER_ADDRESS,
    chancesWithAddresses: chancesWithAddresses
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

        const deployResult = await lootbox.sendDeploy(deployer.getSender(), toNano('0.05'));

        expect(deployResult.transactions).toHaveTransaction({
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

    it('should take excess', async () => {
        let result = await lootbox.sendTakeExcess(deployer.getSender(), toNano('0.05'));

        expect(result.transactions).toHaveTransaction({
            from: lootbox.address,
            to: deployer.address,
            op: 0xd53276db,
        });
    });

    it('should cancel', async () => {
        let result = await lootbox.sendCancel(deployer.getSender(), toNano('1'));

        Object.values(chancesWithAddresses).forEach((address) => {
            expect(result.transactions).toHaveTransaction({
                from: lootbox.address,
                to: address,
                op: 0x5fcc3d14,
            });
        });

        expect(result.transactions).toHaveTransaction({
            from: lootbox.address,
            to: deployer.address,
            op: 0xd53276db,
        });

        let secondCancel = await lootbox.sendCancel(deployer.getSender(), toNano('1'));

        expect(secondCancel.transactions).toHaveTransaction({
            to: lootbox.address,
            exitCode: 401,
            op: 0xcc0f2526,
        });
    });

    it('should return getChancs', async () => {
        let chancesData = await lootbox.getChancesData();

        expect(chancesData.chances.keys()).toEqual(Object.keys(chancesWithAddresses).map(e => Number.parseInt(e)))
    });

    it('full scenario', async () => {
        let i = 1;
        let oldAddresses = Object.values(chancesWithAddresses).map(a => a.toString());
        const totalItemsLength = Object.keys(chancesWithAddresses).length

        while(i <= totalItemsLength) {
            let mintResult = await lootbox.sendMint(deployer.getSender(), toNano('10'))
            let chancesData = await lootbox.getChancesData()
            let newAddresses = chancesData.chances.values().map(a => a.toString());
            let address = oldAddresses.filter((a: any) => !newAddresses.includes(a))[0]
            oldAddresses = newAddresses;

            expect(mintResult.transactions).toHaveTransaction({
                from: lootbox.address,
                to: Address.parse(address),
                op: 0x5fcc3d14
            });
            expect(chancesData.chances.keys().length).toEqual(totalItemsLength - i)

            i += 1;
        }

        let mintResult = await lootbox.sendMint(deployer.getSender(), toNano('10'))
        expect(mintResult.transactions).toHaveTransaction({
            to: lootbox.address,
            exitCode: 400,
            value: toNano('10')
        });
    })
});
