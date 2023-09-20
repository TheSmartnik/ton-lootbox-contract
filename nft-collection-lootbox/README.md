# Lootbox Nft Colleciton

This contract allows to create Nft Collection that will mint fixed set of nft_items with predefined chances

## Defining Chances
Chances are definied by a dictionary where key is an item upper bound and value is a cell containg content of an item

### Example when deployed via CLI
Create a json file with the following content. You will provide a path to the file later

```json
{
  "40": "ipfs://long_string/1.jpg",
  "70": "ipfs://long_string/2.jpg",
  "90": "ipfs://long_string/3.jpg",
  "100": "ipfs://long_string/4.jpg"
}
```

### Example when deployed manually
```ts
let create_content = (content: String): Cell => (beginCell().storeBuffer(Buffer.from(content))).endCell();

let chancesWithContent = {
  40: create_content("ipfs://long_string/1.jpg"),
  70: create_content("ipfs://long_string/2.jpg"),
  90: create_content("ipfs://long_string/3.jpg"),
  100: create_content("ipfs://long_string/4.jpg")
}
```

### Example explanation 

In the example above items will have the following chances to be minted

|Chance|Content|
| --- | --- |
|    40% | ipfs://long_string/1.jpg|
|    30% | ipfs://long_string/2.jpg|
|    20% | ipfs://long_string/3.jpg|
|    10% | ipfs://long_string/4.jpg|


## Deployment

### CLI Contract Deployment

Run the following command and follow the steps

```bash
CHANCES_WITH_CONTENT_PATH='path/to/file' npx blueprint run
```

### Manual Contract Deployment
* Create chances dictionary following the steps above
* Then create collectionContentCell. The process is the same as for any NFT collection
* Create a config
```js
config = {
    nextItemIndex: 0,
    owner: ownerAddress,
    content: collectionContentCell ,
    royaltyParams: new Cell(),
    chancesWithContent: chancesWithContent
}
```

Initialize everything and deploy the contract

```js
const lootbox = provider.open(
        Lootbox.createFromConfig(config),
        Lootbox.code
)

await lootbox.sendDeploy(provider.sender(), toNano('0.05'));

```

## Minting
### CLI Minting
Run the following command and follow step

```bash
npx blueprint run mintItem
```

### Manual Minting
For a first run
```
const lootbox = provider.open(Lootbox.createFromAddress(lootboxAddress));

const itemAddress = await lootbox.getItemAddress(lootbox.nextItemIndex);
await lootbox.sendMint(provider.sender());
```

For consecutive runs
```
const lootbox = provider.open(Lootbox.createFromAddress(lootboxAddress));

const lootboxData = await lootbox.getLootboxData();
lootbox.setNextItemIndex(lootboxData.nextItemIndex);

const itemAddress = await lootbox.getItemAddress(lootbox.nextItemIndex);
await lootbox.sendMint(provider.sender());
```
  
# License
MIT
