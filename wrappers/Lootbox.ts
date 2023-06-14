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

export type LootboxConfig = {
    owner: Address
    nextItemIndex?: number
    content?: Cell
    itemCode?: Cell
    royaltyParams?: Cell
    chancesCell: Dictionary<number, Cell>
};

function LootboxConfigToCell(config: LootboxConfig): Cell {
    return beginCell()
        .storeAddress(config.owner)
        .storeUint(config.nextItemIndex ?? 0, 64)
        .storeRef(config.content ?? beginCell().storeRef(new Cell()))
        .storeRef(config.itemCode ?? NftItem.code)
        .storeRef(config.royaltyParams ?? new Cell())
        .storeDict(config.chancesCell, Dictionary.Keys.Uint(16), Dictionary.Values.Cell())
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

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            body: beginCell().endCell(),
        })
    }

    async sendMint(provider: ContractProvider, via: Sender, to: Address, params?: Partial<{
        value: bigint
        itemValue: bigint
        content: Cell
    }>) {
        const index = this.nextItemIndex++
        await provider.internal(via, {
            value: params?.value ?? toNano('0.05'),
            body: beginCell()
                .storeUint(1, 32) // op
                .storeUint(0, 64) // query id
                .storeUint(index, 64)
                .storeCoins(params?.itemValue ?? toNano('0.02'))
                .storeRef(beginCell()
                    .storeAddress(to)
                    .storeRef(params?.content ?? new Cell()))
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

    async getCollectionData(provider: ContractProvider): Promise<LootboxData> {
        const { stack } = await provider.get('get_collection_data', [])
        return {
            nextItemIndex: stack.readNumber(),
            content: stack.readCell(),
            owner: stack.readAddress(),
        }
    }
}
