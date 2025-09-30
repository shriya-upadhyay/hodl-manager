/* eslint-disable no-console */
/* eslint-disable max-len */
import dotenv from "dotenv";
dotenv.config();
import {
	Account,
	AccountAddress,
	Aptos,
	AptosConfig,
	Ed25519PrivateKey,
	Network,
	NetworkToNetworkName,
} from "@aptos-labs/ts-sdk";

/**
 * This script mints DoraHacks USDC directly to a specified wallet address.
 * 
 * Usage:
 * 1. Set DEPLOYER_PRIVATE_KEY or VENDOR_PRIVATE_KEY in your .env file
 * 2. Run: npm run mint:usdc <wallet_address> <amount>
 * 
 * Example:
 * npm run mint:usdc 0x123...abc 1000
 * 
 * Required environment variables:
 * - DEPLOYER_PRIVATE_KEY or VENDOR_PRIVATE_KEY: The private key of the deployed vendor (admin)
 */

// Set up the client
const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

/** Mint DoraHacks USDC directly to an address (admin only) */
async function mintUsdcTo(
	admin: Account,
	toAddress: AccountAddress,
	amount: number
): Promise<string> {
	const transaction = await aptos.transaction.build.simple({
		sender: admin.accountAddress,
		data: {
			function: `${admin.accountAddress}::usdc_vendor::mint_to`,
			typeArguments: [],
			functionArguments: [toAddress, amount],
		},
	});

	const senderAuthenticator = aptos.transaction.sign({ signer: admin, transaction });
	const pendingTxn = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });

	return pendingTxn.hash;
}

/** Get fungible asset balance via Indexer */
async function getFungibleAssetBalance(accountAddress: AccountAddress, assetAddress: AccountAddress) {
	try {
		const balances = await aptos.getCurrentFungibleAssetBalances({
			options: {
				where: {
					owner_address: { _eq: accountAddress.toStringLong() },
					asset_type: { _eq: assetAddress.toStringLong() },
				},
				limit: 1,
			},
		});
		return balances[0]?.amount ?? 0;
	} catch (error) {
		console.log("Could not fetch balance:", error);
		return 0;
	}
}

/** Fetch USDC metadata object address from the vendor module view */
async function getUsdcMetadataAddress(vendorAddress: AccountAddress): Promise<AccountAddress> {
	const [metadataAddress] = await aptos.view({
		payload: {
			function: `${vendorAddress.toString()}::usdc_vendor::get_metadata_address`,
			typeArguments: [],
			functionArguments: [],
		},
	});
	return AccountAddress.fromString(String(metadataAddress));
}

async function main() {
	// Get command line arguments
	const args = process.argv.slice(2);
	if (args.length < 2) {
		console.error("Usage: tsx scripts/mint-usdc-to-wallet.ts <wallet_address> <amount>");
		console.error("Example: tsx scripts/mint-usdc-to-wallet.ts 0x123...abc 1000");
		process.exit(1);
	}

	const walletAddress = args[0];
	const amount = parseInt(args[1]);

	if (isNaN(amount) || amount <= 0) {
		console.error("Error: Amount must be a positive number");
		process.exit(1);
	}

	// Validate required environment variables
	const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.VENDOR_PRIVATE_KEY;
	if (!privateKey) {
		console.error("Error: DEPLOYER_PRIVATE_KEY or VENDOR_PRIVATE_KEY environment variable is required");
		console.error("This should be the private key of the deployed USDC vendor (admin account)");
		process.exit(1);
	}

	try {
		// Load admin account from private key
		const admin = Account.fromPrivateKey({
			privateKey: new Ed25519PrivateKey(privateKey),
		});

		// Parse target wallet address
		const targetAddress = AccountAddress.fromString(walletAddress);

		console.log("\n=== Minting DoraHacks USDC ===");
		console.log(`Admin/Vendor: ${admin.accountAddress.toString()}`);
		console.log(`Target wallet: ${targetAddress.toString()}`);
		console.log(`Amount to mint: ${amount} USDC`);
		console.log(`Network: ${APTOS_NETWORK}`);

		// Get USDC metadata address for balance checking
		const usdcMetadataAddress = await getUsdcMetadataAddress(admin.accountAddress);
		console.log(`USDC asset address: ${usdcMetadataAddress.toString()}`);

		// Check initial balance
		const initialBalance = await getFungibleAssetBalance(targetAddress, usdcMetadataAddress);
		console.log(`Initial USDC balance: ${initialBalance}`);

		// Mint USDC to the target address
		console.log("\n=== Minting USDC ===");
		const mintHash = await mintUsdcTo(admin, targetAddress, amount);
		console.log(`Mint transaction submitted: ${mintHash}`);

		// Wait for transaction confirmation
		await aptos.waitForTransaction({ transactionHash: mintHash });
		console.log("✅ Transaction confirmed!");

		// Check final balance
		const finalBalance = await getFungibleAssetBalance(targetAddress, usdcMetadataAddress);
		console.log(`Final USDC balance: ${finalBalance}`);
		console.log(`Minted amount: ${Number(finalBalance) - Number(initialBalance)}`);

		console.log("\n=== Minting completed successfully! ===");
		console.log(`Transaction hash: ${mintHash}`);
		console.log(`View on explorer: https://explorer.aptoslabs.com/txn/${mintHash}?network=${APTOS_NETWORK}`);

	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

main().catch(console.error);
