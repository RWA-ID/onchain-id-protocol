import { ethers } from "hardhat";

/**
 * Example: register subnames in bulk via the SubnameRegistrar.
 *
 * Usage:
 *   npx hardhat run scripts/register-bulk.ts --network mainnet
 *
 * Edit LABELS and PARENT_LABEL below to customize.
 */

const REGISTRAR = "0xf2D0f2057A1C5323015cF51baFCDf57293F86d04";
const PUBLIC_RESOLVER = "0xF29100983E058B709F3D539b0c765937B804AC15";

// --- Customize these ---
const PARENT_LABEL = "robot-id";
const LABELS = ["alpha-001", "alpha-002", "alpha-003"];
const TTL = 0;
// -----------------------

const REGISTRAR_ABI = [
  "function quoteBulk(uint256 quantity) external view returns (uint256 requiredWei, uint256 feePerSubCents, uint256 ethPrice8)",
  "function registerBulk(string parentLabel, string[] labels, address to, address resolver, uint64 ttl) external payable",
  "function hasLicense(address user, string parentLabel) external view returns (bool)",
];

async function main() {
  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const registrar = new ethers.Contract(REGISTRAR, REGISTRAR_ABI, signer);

  const licensed = await registrar.hasLicense(signer.address, PARENT_LABEL);
  let value = ethers.BigNumber.from(0);

  if (licensed) {
    console.log("You hold a license for", PARENT_LABEL, "— no per-sub fee.");
  } else {
    const quote = await registrar.quoteBulk(LABELS.length);
    console.log(`Quote: ${ethers.utils.formatEther(quote.requiredWei)} ETH for ${LABELS.length} subs`);
    console.log(`  Per-sub: ${quote.feePerSubCents.toString()} cents | ETH/USD: $${(quote.ethPrice8 / 1e8).toFixed(2)}`);
    value = quote.requiredWei;
  }

  console.log(`Registering ${LABELS.length} subnames under ${PARENT_LABEL}.eth ...`);
  const tx = await registrar.registerBulk(
    PARENT_LABEL,
    LABELS,
    signer.address,
    PUBLIC_RESOLVER,
    TTL,
    { value }
  );
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
