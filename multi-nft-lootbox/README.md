# Multi NFT Lootbox

A special contract that allows to create lootboxes with NFTs from multiple collections. Chances are predifined and later redistributed among remaning NFTS

# Step By Step Overview

1. Create a file with chances and NFT item addresses
2. Deploy a lootbox
3. Set NFT Items to owner to deployed lootbox

* You can also cancel lootbox
* Since all the money from sales stay on contract. You can always take excess

## Defining Chances
Chances are definied by a dictionary where key is an item upper bound and a  is an NFT Item address

### Example when deployed via CLI
Create a json file with the following content. You will provide a path to the file later

```json
{
  "40": "EQC8mtvzfDEZ0kNAHamDb278tXKol0M8mzFOtvivXMtxk_UZ",
  "70": "EQCiLDwjuJvRDO_1BDZP538h3FRlwHyaHzGdDARU_aBJHG-8",
  "90": "EQA5tnNqVGlA_bc4NzSXRKFj1az33FyJGLk9U_2jvF0qxB2e",
  "100": "EQDyCSLLwtQgGQI1J_uOHCSZ68l65VaaeapskG9-HQQHW_85"
}

```

### Example explanation 

In the example above items will have the following chances to be minted

|Chance|Content|
| --- | --- |
|    40% | "EQC8mtvzfDEZ0kNAHamDb278tXKol0M8mzFOtvivXMtxk_UZ"|
|    30% | "EQCiLDwjuJvRDO_1BDZP538h3FRlwHyaHzGdDARU_aBJHG-8"|
|    20% | "EQA5tnNqVGlA_bc4NzSXRKFj1az33FyJGLk9U_2jvF0qxB2e"|
|    10% | "EQDyCSLLwtQgGQI1J_uOHCSZ68l65VaaeapskG9-HQQHW_85"|


## Deployment

### CLI Contract Deployment

Run the following command and follow the steps

```bash
CHANCES_WITH_ADDRESSES_PATH='path/to/file' npx blueprint run
```

## Receiving an item
* To receive an item just send an empty message with a lootbox price
* A random chance will be assigned to `query_id` in an nft transfer message
* Chances will be redistributed

## Other Commands

### Cancel Lootbox
This will
* Assign ownership of NFT items to a lootbox deployer
* Transfer all contracts balance to a lootbox deployer

```bash
npx blueprint run cancelLootbox
``` 


### Take Excess Lootbox
This will transfer almost all _(leaving 0.05 for storage)_ contracts balance to a lootbox deployer

```bash
npx blueprint run takeExcessLootbox
``` 
  
# License
MIT
