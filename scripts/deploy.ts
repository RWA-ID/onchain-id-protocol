import hre from "hardhat";

async function main() {
    console.log(`Deploying to ${hre.network.name}...`);

    const contract = await hre.viem.deployContract("SubnameRegistrar", [
        "0x0635513f179D50A207757E05759CbD106d7dFcE8", // NameWrapper on Sepolia
        "0x694AA1769357215DE4FAC081bf1f309aDC325306", // ETH/USD oracle on Sepolia
        "0x5f11a48230f7CdaB91A2361576239091E4b1165b", // Initial owner
        "0x5f11a48230f7CdaB91A2361576239091E4b1165b"  // Initial payout
    ]);

    console.log(`Deployed to ${hre.network.name}:`, contract.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
