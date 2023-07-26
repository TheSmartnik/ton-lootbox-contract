import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, toNano, Dictionary } from "ton-core";
import { NftItem } from "./NftItem";

export type LootboxData = {
    nextItemIndex: number
    content: Cell
    owner: Address
}

export type RoyaltyData = {
    royaltyFactor: number,
    royaltyBase: number,
    royaltyAddress: Address
}

export type chancesWithContent = {
    [key: string]: Cell
}

export type LootboxConfig = {
    owner: Address
    nextItemIndex?: number
    content?: Cell
    itemCode?: Cell
    royaltyParams?: Cell
    chancesWithContent: chancesWithContent
};

function createLootboxContent(chancesWithContent: chancesWithContent): Cell {

    let chances = Object.keys(chancesWithContent).map( e => Number.parseInt(e));
    let contentsCell = Dictionary.empty<number, Cell>();

    if (chances[chances.length - 1] > 100) {
        throw new Error('Last element should be less or equal to 100');
    } else if (chances[0] <= 0) {
        throw new Error('First element should be above 0');
    }

    const chancesCell = beginCell().storeUint(chances.length, 16);
    chances.forEach(chance => chancesCell.storeUint(chance, 16));
    Object.values(chancesWithContent).forEach((content, index) => contentsCell.set(index, content));

    const lootboxContent = beginCell()
        .storeRef(chancesCell.endCell())
        .storeDict(contentsCell, Dictionary.Keys.Uint(16), Dictionary.Values.Cell())
        .endCell()

    return lootboxContent;
}

function LootboxConfigToCell(config: LootboxConfig): Cell {
    let lootboxContent = createLootboxContent(config.chancesWithContent);
    return beginCell()
        .storeAddress(config.owner)
        .storeUint(config.nextItemIndex ?? 0, 64)
        .storeRef(config.content ?? beginCell().storeRef(new Cell()))
        .storeRef(config.itemCode ?? NftItem.code)
        .storeRef(config.royaltyParams ?? new Cell())
        .storeRef(lootboxContent)
        .endCell();
}

export class Lootbox implements Contract {
    static readonly code = Cell.fromBase64('te6ccgECEwEAAf4AART/APSkE/S88sgLAQIBYgIDAgLNBAUCASANDgPr0QY4BIrfAA6GmBgLjYSK3wfSAYAOmP6Z/2omh9IGmf6mpqGEEINJ6cqClAXUcUG6+CgOhBCFRlgFa4QAhkZYKoAueLEn0BCmW1CeWP5Z+A54tkwCB9gHAbKLnjgvlwyJLgAPGBEuABcYEZAmAB8YEvgsIH+XhAYHCAIBIAkKAGA1AtM/UxO78uGSUxO6AfoA1DAoEDRZ8AaOEgGkQ0PIUAXPFhPLP8zMzMntVJJfBeIApjVwA9QwjjeAQPSWb6UgjikGpCCBAPq+k/LBj96BAZMhoFMlu/L0AvoA1DAiVEsw8AYjupMCpALeBJJsIeKz5jAyUERDE8hQBc8WE8s/zMzMye1UACgB+kAwQUTIUAXPFhPLP8zMzMntVAIBIAsMAD1FrwBHAh8AV3gBjIywVYzxZQBPoCE8trEszMyXH7AIAC0AcjLP/gozxbJcCDIywET9AD0AMsAyYAAbPkAdMjLAhLKB8v/ydCACASAPEAAlvILfaiaH0gaZ/qamoYLehqGCxABDuLXTHtRND6QNM/1NTUMBAkXwTQ1DHUMNBxyMsHAc8WzMmAIBIBESAC+12v2omh9IGmf6mpqGDYg6GmH6Yf9IBhAALbT0faiaH0gaZ/qamoYCi+CeAI4APgCw')

    nextItemIndex: number = 0;

    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Lootbox(address);
    }

    static createFromConfig(config: LootboxConfig, code: Cell, workchain = 0) {
        const data = LootboxConfigToCell(config);
        const init = { code, data };
        const collection = new Lootbox(contractAddress(workchain, init), init);
        if (config.nextItemIndex !== undefined) {
            collection.nextItemIndex = config.nextItemIndex;
        }
        return collection;
    }

    static printChancesFromCOnfig({ chancesWithContent }: LootboxConfig) {
        let previousChance = 0;
        let chances = Object.keys(chancesWithContent).map(e => Number.parseInt(e));
        let hint = chances.map((chance: number) => {
            let actualChance = chance - previousChance
            previousChance = chance;
            let content = chancesWithContent[chance].beginParse().loadStringTail();

            return `| ${actualChance.toString().padStart(5, ' ')}% | ${content}`
        }).join("\n")

        return `| Chance | Content\n${hint}`;
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            body: beginCell().endCell(),
        })
    }

    async sendMint(provider: ContractProvider, via: Sender, to: Address, params: Partial<{
        value: bigint
        itemValue: bigint
    }>) {
        const index = this.nextItemIndex++
        await provider.internal(via, {
            value: params?.value ?? toNano('0.05'),
            body: beginCell()
                .storeUint(1, 32) // op
                .storeUint(0, 64) // query id
                .storeUint(index, 64)
                .storeCoins(params?.itemValue ?? toNano('0.02'))
                .storeAddress(to)
                .endCell()
        })
        return index
    }

    async getItemAddress(provider: ContractProvider, index: number): Promise<Address> {
        const res = await provider.get('get_nft_address_by_index', [{ type: 'int', value: BigInt(index) }])
        return res.stack.readAddress()
    }

    async getRoyaltyParams(provider: ContractProvider): Promise<RoyaltyData> {
        const res = await provider.get('royalty_params', [])
        return {
            royaltyFactor: res.stack.readNumber(),
            royaltyBase: res.stack.readNumber(),
            royaltyAddress: res.stack.readAddress()
        }
    }

    async getChances(provider: ContractProvider): Promise<Cell> {
        const res = await provider.get('chances_cell', [])

        return res.stack.readCell();
    }

    async getCollectionData(provider: ContractProvider): Promise<LootboxData> {
        const { stack } = await provider.get('get_collection_data', [])
        return {
            nextItemIndex: stack.readNumber(),
            content: stack.readCell(),
            owner: stack.readAddress(),
        }
    }
}
