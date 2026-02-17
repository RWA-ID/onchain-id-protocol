import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const NAME_WRAPPER = "0xD4416b13d2b3a9aBae7AcD5D6C2BbDBE25686401";
  const ETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419";
  const PAYOUT = deployer.address;

  const Registrar = await ethers.getContractFactory("SubnameRegistrar");

  const registrar = await Registrar.deploy(
    NAME_WRAPPER,
    ETH_USD_FEED,
    deployer.address,
    PAYOUT,
    { gasLimit: 7_000_000 }
  );

  await registrar.deployed();

  console.log("SubnameRegistrar deployed:", registrar.address);
  console.log(
    "licensePriceUSD:",
    (await registrar.licensePriceUSD()).toString()
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

