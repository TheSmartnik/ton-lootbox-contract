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
    static readonly code = Cell.fromBase64('te6ccgECFwEAAngAART/APSkE/S88sgLAQIBYgsCAgEgBAMAKbyC32omh9IGmf6mpqahgvgehqGCxAIBIAoFAgEgCQYCASAIBwAhsBh7UTQ+kDTP9TU1NQwbFGAAMbHo+1E0PpA0z/U1NTUMBAlXwXwA3AB8ASAAM7Xa/aiaH0gaZ/qampqGAqvguhph+mH/SAYQAEW4tdMe1E0PpA0z/U1NTUMBA1XwXQ1DHUMNBxyMsHAc8WzMmAICzQ8MAgEgDg0ATVUEPwA3Ah8ATIUAXPFhPMyXeAGMjLBVAFzxZY+gITy2vMzMlx+wCAAbT5AHTIywISygfL/8nQgCASAREAAtUByMs/+CjPFslwIMjLARP0APQAywDJgE9UIMcAkVvgAdDTAwFxsJFb4PpAMAHTH9M/7UTQ+kDTP9TU1NQwghBpPTlQUpC6jikWXwZsEtCCEKjLAK1wgBDIywVQBc8WJPoCFMtqE8sfyz8BzxbJgED7AOA3UYTHBfLhkSXQ1PQEMAHQKMAB4wIowALjAlszBcAD4wKBUUExIADF8GhA/y8AAwAvpAMEFVBAPIUAbPFhTLPxLMzMzMye1UAb44cAbUjsEBgED0lm+lII6xCqQggQD6vpPywY/egQGTIaBTKbvy9AL6ADAE+kBT1ts8I1E5A0gY8AcnupMGpAbeCJJsIeKzEuZfAzQ1BFBTyFAGzxYUyz8SzMzMzMntVBYBcjgF0z9TFLvy4ZJTFLoB+gD6QDBQqNs8IxA0SojwBwWOFKQEUFPIUAbPFhTLPxLMzMzMye1Ukl8G4hYAUPgl+BWAZPgRcAPTD9MPmVETuyKlUmC5sJUEpATTD+hfA4AQ9A9voTA=')

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

    static printChancesFromConfig({ chancesWithContent }: LootboxConfig) {
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

    setNextItemIndex(index: number) {
        this.nextItemIndex = index;
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            body: beginCell().endCell(),
        })
    }

    async sendMint(provider: ContractProvider, via: Sender, params?: Partial<{
        value?: bigint
        itemValue?: bigint
        queryId?: number
    }>) {
        await provider.internal(via, {
            value: params?.value ?? toNano('0.05'),
            body: beginCell()
                .storeUint(1, 32) // op
                .storeUint(params?.queryId ?? 0, 64)
                .storeUint(this.nextItemIndex, 64)
                .storeCoins(params?.itemValue ?? toNano('0.02'))
                .storeAddress(this.address)
                .endCell()
        })

        const index = this.nextItemIndex++
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

    async getLootboxData(provider: ContractProvider): Promise<LootboxData> {
        const { stack } = await provider.get('get_collection_data', [])
        return {
            nextItemIndex: stack.readNumber(),
            content: stack.readCell(),
            owner: stack.readAddress(),
        }
    }
}
