import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, toNano, Dictionary } from "ton-core";

export type chancesWithAddresses = {
    [key: string]: Address
}

export type LootboxConfig = {
    owner: Address
    price: bigint
    chancesWithAddresses: chancesWithAddresses
};

export type chancesData = {
    chances: Dictionary<number, Address>
    chancesLength: bigint
};


function createLootboxContent(chancesWithAddresses: chancesWithAddresses): Cell {
    let chances = Object.keys(chancesWithAddresses).map( e => Number.parseInt(e));
    let chancesWithContentCell = Dictionary.empty<number, Address>();

    Object.keys(chancesWithAddresses).forEach((e) => {
        let chance = Number.parseInt(e)
        chancesWithContentCell.set(chance, chancesWithAddresses[e])
    })

    if (chances[chances.length - 1] > 100) {
        throw new Error('Last element should be less or equal to 100');
    } else if (chances[0] <= 0) {
        throw new Error('First element should be above 0');
    }

    const lootboxContent = beginCell()
        .storeUint(chances.length, 16)
        .storeDict(chancesWithContentCell, Dictionary.Keys.Uint(16), Dictionary.Values.Address())
        .storeUint(0, 16) // last chance
        .endCell()

    return lootboxContent;
}

function LootboxConfigToCell(config: LootboxConfig): Cell {
    let lootboxContent = createLootboxContent(config.chancesWithAddresses);
    return beginCell()
        .storeAddress(config.owner)
        .storeCoins(config.price)
        .storeRef(lootboxContent)
        .endCell();
}

export class Lootbox implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Lootbox(address);
    }

    static createFromConfig(config: LootboxConfig, code: Cell, workchain = 0) {
        const data = LootboxConfigToCell(config);
        const init = { code, data };

        return new Lootbox(contractAddress(workchain, init), init);
    }

    static printChancesFromConfig({ chancesWithAddresses }: LootboxConfig) {
        let previousChance = 0;
        let chances = Object.keys(chancesWithAddresses).map(e => Number.parseInt(e));
        let hint = chances.map((chance: number) => {
            let actualChance = chance - previousChance
            previousChance = chance;
            let content = chancesWithAddresses[chance].toString();

            return `| ${actualChance.toString().padStart(5, ' ')}% | ${content}`
        }).join("\n")

        return `| Chance | Content\n${hint}`;
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, params?: Partial<{
        queryId?: number
    }>) {
        await provider.internal(via, {
            value,
            body: beginCell()
                .storeUint(0, 32) // op
                .storeUint(params?.queryId ?? 0, 64)
                .endCell()
        })
    }

    async sendMint(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            body: beginCell().endCell()
        })
    }

    async sendTakeExcess(provider: ContractProvider, via: Sender, value: bigint, params?: Partial<{
        queryId?: number
    }>) {
        await provider.internal(via, {
            value,
            body: beginCell()
                .storeUint(0xd136d3b3, 32) // op
                .storeUint(params?.queryId ?? 0, 64)
                .endCell()
        })
    }


    async sendCancel(provider: ContractProvider, via: Sender, value: bigint, params?: Partial<{
        queryId?: number
    }>) {
        await provider.internal(via, {
            value,
            body: beginCell()
                .storeUint(0xcc0f2526, 32) // op
                .storeUint(params?.queryId ?? 0, 64)
                .endCell()
        })
    }

    async getChancesData(provider: ContractProvider): Promise<chancesData> {
        const res = await provider.get('get_chances_data', [])
        const stack = res.stack;

        const chancesLength = stack.readBigNumber();
        let chances;
        if(chancesLength > 0) {
            chances = stack.readCell().beginParse().loadDictDirect(Dictionary.Keys.Uint(16), Dictionary.Values.Address())
        } else {
            stack.skip()
            chances = Dictionary.empty<number, Address>()
        }

        return { chancesLength, chances };
    }
}
