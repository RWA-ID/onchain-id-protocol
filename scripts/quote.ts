import { ethers } from "hardhat";

/**
 * Query the SubnameRegistrar for current pricing.
 *
 * Usage:
 *   QUANTITY=25 npx hardhat run scripts/quote.ts --network mainnet
 */

const REGISTRAR = "0xf2D0f2057A1C5323015cF51baFCDf57293F86d04";

const REGISTRAR_ABI = [
  "function quoteBulk(uint256 quantity) external view returns (uint256 requiredWei, uint256 feePerSubCents, uint256 ethPrice8)",
  "function licensePriceUSD() external view returns (uint256)",
  "function tierPricesUSD(uint256) external view returns (uint256)",
];

async function main() {
  const quantity = parseInt(process.env.QUANTITY || "10", 10);
  console.log(`Querying price for ${quantity} subnames...\n`);

  const registrar = new ethers.Contract(
    REGISTRAR,
    REGISTRAR_ABI,
    ethers.provider
  );

  const [tier0, tier1, tier2] = await Promise.all([
    registrar.tierPricesUSD(0),
    registrar.tierPricesUSD(1),
    registrar.tierPricesUSD(2),
  ]);

  console.log("Tier pricing (cents per sub):");
  console.log(`  1-10 subs:  ${tier0.toString()} cents ($${(tier0 / 100).toFixed(2)})`);
  console.log(`  11-50 subs: ${tier1.toString()} cents ($${(tier1 / 100).toFixed(2)})`);
  console.log(`  51+ subs:   ${tier2.toString()} cents ($${(tier2 / 100).toFixed(2)})`);

  const licensePrice = await registrar.licensePriceUSD();
  console.log(`\nLicense price: $${(licensePrice / 1e8).toLocaleString()} USD`);

  const quote = await registrar.quoteBulk(quantity);
  const ethPriceUSD = quote.ethPrice8 / 1e8;

  console.log(`\nQuote for ${quantity} subnames:`);
  console.log(`  Per-sub fee: ${quote.feePerSubCents.toString()} cents`);
  console.log(`  ETH/USD:     $${ethPriceUSD.toFixed(2)}`);
  console.log(`  Total cost:  ${ethers.utils.formatEther(quote.requiredWei)} ETH`);
  console.log(`             ≈ $${((Number(ethers.utils.formatEther(quote.requiredWei))) * ethPriceUSD).toFixed(2)} USD`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
