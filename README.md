# Lootboxes Contracts
This project contains two contracts for lootboxes:
* nft-collection-lootbox
* multi-nft-lootbox

## NFT Collection Lootbox

Allows to create a special NFT collection with predefined chances to drop items. NFT items won't be unique in this case

### Pros

* Behaves and looks identical to nft collection
* Resulting items are nfts. Code of an NFT Item can be changed

### Cons 

* Not unique NFTS
* Can't lootbox from multiple collections
* NFTs are minted by the owner (can be easily changed)

## Multi NFT Lootbox

A special contract that allows to create lootboxes with NFTs from multiple collections. Chances are predifined and later redistributed among remaning NFTS

### Pros
* NFTS can be combined from multiple NFT collections
* Easy interaction by user. User sends predefined amount of money and receiveds unique NFT


### Cons 
* Heavier on gas

