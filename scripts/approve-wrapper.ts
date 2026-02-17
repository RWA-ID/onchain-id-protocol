import { ethers } from "hardhat";

/**
 * Approve the SubnameRegistrar contract as an operator on the ENS NameWrapper.
 * This must be called by the owner of the parent names so the registrar
 * can call setSubnodeRecord on their behalf.
 *
 * Usage:
 *   npx hardhat run scripts/approve-wrapper.ts --network mainnet
 */

const REGISTRAR = "0xf2D0f2057A1C5323015cF51baFCDf57293F86d04";

// NameWrapper addresses per network
const NAME_WRAPPER: Record<string, string> = {
  mainnet: "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401",
  sepolia: "0x0635513f179D50A207757E05759CbD106d7dFcE8",
};

async function main() {
  const network = await ethers.provider.getNetwork();
  const networkName = network.name === "homestead" ? "mainnet" : network.name;
  const wrapperAddr = NAME_WRAPPER[networkName];
  if (!wrapperAddr) throw new Error(`No NameWrapper configured for ${networkName}`);

  const [signer] = await ethers.getSigners();
  console.log("Signer:", signer.address);

  const wrapper = await ethers.getContractAt(
    ["function setApprovalForAll(address operator, bool approved) external",
     "function isApprovedForAll(address account, address operator) external view returns (bool)"],
    wrapperAddr,
    signer
  );

  const alreadyApproved = await wrapper.isApprovedForAll(signer.address, REGISTRAR);
  if (alreadyApproved) {
    console.log("Registrar is already approved as operator on NameWrapper.");
    return;
  }

  console.log(`Approving ${REGISTRAR} as operator on NameWrapper (${wrapperAddr})...`);
  const tx = await wrapper.setApprovalForAll(REGISTRAR, true);
  console.log("Tx hash:", tx.hash);
  await tx.wait();
  console.log("Approved.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
