# Onchain ID Protocol

Smart contract infrastructure for issuing machine-readable ENS subname identities at scale. Built on Ethereum mainnet with ENS NameWrapper integration and Chainlink oracle pricing.

## Overview

Onchain ID lets organizations register ENS subnames (e.g. `alpha-001.robot-id.eth`) for IoT devices, robots, drones, vehicles, and machines. The `SubnameRegistrar` contract supports two access models:

1. **License NFT** — Pay $100,000 USD (in ETH) for unlimited subname registration under a parent zone
2. **Pay-per-sub** — Tiered pricing based on batch size, no license required

### Parent Zones

| Zone | Example Subname |
|------|-----------------|
| `robot-id.eth` | `unit-42.robot-id.eth` |
| `device-id.eth` | `sensor-7.device-id.eth` |
| `drone-id.eth` | `hawk-01.drone-id.eth` |
| `machine-id.eth` | `press-3.machine-id.eth` |
| `vehicle-id.eth` | `truck-99.vehicle-id.eth` |

### Pay-per-sub Pricing

| Quantity | Price per sub |
|----------|---------------|
| 1-10 | $4.50 |
| 11-50 | $3.00 |
| 51+ | $1.50 |

All USD prices are converted to ETH at the time of transaction using the Chainlink ETH/USD oracle.

## Architecture

```
                          ┌──────────────────┐
                          │   Caller / DApp  │
                          └────────┬─────────┘
                                   │
                    registerBulk() │ buyLicense()
                                   │
                          ┌────────▼─────────┐
                          │ SubnameRegistrar  │
                          │   (this contract) │
                          │                   │
                          │ - License NFTs    │
                          │ - Tiered pricing  │
                          │ - Bulk register   │
                          └──┬────────────┬───┘
                             │            │
              setSubnodeRecord()    latestRoundData()
                             │            │
                    ┌────────▼──┐   ┌─────▼──────────┐
                    │    ENS    │   │   Chainlink     │
                    │NameWrapper│   │  ETH/USD Oracle │
                    └───────────┘   └────────────────┘
```

## Deployment

### Mainnet Addresses

| Contract | Address |
|----------|---------|
| **SubnameRegistrar** | [`0xf2D0f2057A1C5323015cF51baFCDf57293F86d04`](https://etherscan.io/address/0xf2D0f2057A1C5323015cF51baFCDf57293F86d04) |

### Constructor Arguments

| Parameter | Value |
|-----------|-------|
| `_nameWrapper` | `0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401` (ENS NameWrapper) |
| `_oracle` | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` (Chainlink ETH/USD) |
| `initialOwner` | `0x5f11a48230f7CdaB91A2361576239091E4b1165b` |
| `_payoutAddress` | `0x5f11a48230f7CdaB91A2361576239091E4b1165b` |

### External Dependencies

| Dependency | Mainnet | Sepolia |
|------------|---------|---------|
| ENS NameWrapper | `0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401` | `0x0635513f179D50A207757E05759CbD106d7dFcE8` |
| Chainlink ETH/USD | `0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419` | `0x694AA1769357215DE4FAC081bf1f309aDC325306` |
| ENS Registry | `0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e` | — |
| ENS Public Resolver | `0xF29100983E058B709F3D539b0c765937B804AC15` | — |

## Setup

```bash
git clone https://github.com/onchain-idllc/onchain-id-protocol.git
cd onchain-id-protocol
npm install
cp .env.example .env
# Edit .env with your private key and Etherscan API key
```

### Compile

```bash
npx hardhat compile
```

## Deploy

### Sepolia (testnet)

```bash
npm run deploy:sepolia
```

### Mainnet

```bash
npm run deploy:mainnet
```

### Verify on Etherscan

```bash
npx hardhat verify --network mainnet 0xf2D0f2057A1C5323015cF51baFCDf57293F86d04 \
  0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401 \
  0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419 \
  0x5f11a48230f7CdaB91A2361576239091E4b1165b \
  0x5f11a48230f7CdaB91A2361576239091E4b1165b
```

## Interacting with the Contract

### Approve NameWrapper

Before the registrar can create subnames, the parent name owner must approve it as an operator on the NameWrapper:

```bash
npx hardhat run scripts/approve-wrapper.ts --network mainnet
```

### Get a Price Quote

```bash
QUANTITY=25 npx hardhat run scripts/quote.ts --network mainnet
```

### Register Subnames

Edit `scripts/register-bulk.ts` to set your labels and parent zone, then:

```bash
npx hardhat run scripts/register-bulk.ts --network mainnet
```

## Contract Interface

### Write Functions

| Function | Description |
|----------|-------------|
| `buyLicense(string parentLabel)` | Purchase a license NFT for unlimited registration under a parent zone. Requires ETH equivalent of $100,000 USD. |
| `registerBulk(string parentLabel, string[] labels, address to, address resolver, uint64 ttl)` | Register subnames in bulk. Licensed users pay nothing; others pay the tiered per-sub fee. |
| `setLicensePriceUSD(uint256 newPrice)` | Owner only. Update the license price (8-decimal USD). |
| `setTierPricesUSD(uint256[3] newPrices)` | Owner only. Update per-sub tier prices (cents). |
| `setPayoutAddress(address newPayout)` | Owner only. Update the payout address. |
| `withdraw()` | Owner only. Withdraw contract balance to payout address. |

### Read Functions

| Function | Description |
|----------|-------------|
| `quoteBulk(uint256 quantity)` | Returns `(requiredWei, feePerSubCents, ethPrice8)` for a given quantity. |
| `tierForQuantity(uint256 quantity)` | Returns the per-sub fee in cents for a given batch size. |
| `hasLicense(address user, string parentLabel)` | Check if a user holds a license for a parent zone. |
| `licensePriceUSD()` | Current license price in 8-decimal USD. |
| `tierPricesUSD(uint256 index)` | Per-sub fee for tier index (0=small, 1=medium, 2=large). |
| `parents(uint256 index)` | Parent zone label at index. |
| `payoutAddress()` | Current payout address. |

### Events

| Event | Description |
|-------|-------------|
| `LicenseBought(address buyer, uint256 tokenId, string parentLabel)` | Emitted when a license NFT is purchased. |
| `SubdomainsRegistered(address registrant, string parentLabel, uint256 quantity)` | Emitted after a bulk registration. |

## License

MIT
