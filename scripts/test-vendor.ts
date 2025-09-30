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
 * This script tests the deployed USDC Vendor and DoodooCoin contracts.
 * It performs minting, transferring, and vending operations.
 *
 * Required environment variables:
 * - VENDOR_PRIVATE_KEY: The private key of the deployed vendor
 * - MEMECOIN_ADDRESS: The address where the memecoin was deployed (optional, defaults to vendor address)
 */

const DOODOO_COINS_TO_MINT = 1000;
const DOODOO_COINS_TO_TRANSFER = 100;
const USDC_TO_VEND = 50;

// Set up the client
const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

// Target address for transfers
const TARGET_ADDRESS = "0xa33b58aa0d56f2ebde0b3c09fbcf6cdde1d2e5e6823ec74b0d9d8b297f15ed2e";

/** Register an account to receive transfers for a specific coin type */
async function registerCoin(receiver: Account, coinTypeAddress: AccountAddress, coinType: string): Promise<string> {
	const transaction = await aptos.transaction.build.simple({
		sender: receiver.accountAddress,
		data: {
			function: "0x1::managed_coin::register",
			typeArguments: [`${coinTypeAddress}::${coinType}`],
			functionArguments: [],
		},
	});

	const senderAuthenticator = aptos.transaction.sign({ signer: receiver, transaction });
	const pendingTxn = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });

	return pendingTxn.hash;
}

/** Mint coins to a specified address */
async function mintCoin(
	minter: Account,
	receiverAddress: AccountAddress,
	amount: number,
	coinTypeAddress: AccountAddress,
	coinType: string
): Promise<string> {
	const transaction = await aptos.transaction.build.simple({
		sender: minter.accountAddress,
		data: {
			function: "0x1::managed_coin::mint",
			typeArguments: [`${coinTypeAddress}::${coinType}`],
			functionArguments: [receiverAddress, amount],
		},
	});

	const senderAuthenticator = aptos.transaction.sign({ signer: minter, transaction });
	const pendingTxn = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });

	return pendingTxn.hash;
}

/** Transfer coins to a specified address */
async function transferCoin(
	sender: Account,
	receiverAddress: AccountAddress,
	amount: number | bigint,
	coinTypeAddress: AccountAddress,
	coinType: string,
): Promise<string> {
	const transaction = await aptos.transaction.build.simple({
		sender: sender.accountAddress,
		data: {
			function: "0x1::aptos_account::transfer_coins",
			typeArguments: [`${coinTypeAddress}::${coinType}`],
			functionArguments: [receiverAddress, amount],
		},
	});

	const senderAuthenticator = aptos.transaction.sign({ signer: sender, transaction });
	const pendingTxn = await aptos.transaction.submit.simple({ transaction, senderAuthenticator });

	return pendingTxn.hash;
}

/** Use the vend function to swap DoodooCoin for DoraHacks USDC */
async function vendCoins(
	vendor: Account,
	buyer: Account,
	inAmount: number,
	expectedOut: number,
	coinTypeAddress: AccountAddress,
	coinType: string,
): Promise<string> {
	const transaction = await aptos.transaction.build.multiAgent({
		sender: buyer.accountAddress,
		secondarySignerAddresses: [vendor.accountAddress],
		data: {
			function: `${vendor.accountAddress}::usdc_vendor::vend`,
			typeArguments: [`${coinTypeAddress}::${coinType}`],
			functionArguments: [inAmount, expectedOut],
		},
	});

	// Both buyer and vendor need to sign
	const buyerAuthenticator = aptos.transaction.sign({ signer: buyer, transaction });
	const vendorAuthenticator = aptos.transaction.sign({ signer: vendor, transaction });

	const pendingTxn = await aptos.transaction.submit.multiAgent({
		transaction,
		senderAuthenticator: buyerAuthenticator,
		additionalSignersAuthenticators: [vendorAuthenticator],
	});

	return pendingTxn.hash;
}

/** Get balance for a specific coin type */
const getBalance = async (accountAddress: AccountAddress, coinTypeAddress: AccountAddress, coinType: string) =>
	aptos.getBalance({
		accountAddress,
		asset: `${coinTypeAddress.toString()}::${coinType}`,
	});

/** Get fungible asset balance via Indexer */
const getFungibleAssetBalance = async (accountAddress: AccountAddress, assetAddress: AccountAddress) => {
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
};

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
	// Validate required environment variables
	if (!process.env.VENDOR_PRIVATE_KEY) {
		console.error("Error: VENDOR_PRIVATE_KEY environment variable is required");
		process.exit(1);
	}

	// Load vendor account from private key
	const vendor = Account.fromPrivateKey({
		privateKey: new Ed25519PrivateKey(process.env.VENDOR_PRIVATE_KEY),
	});

	// Use memecoin address if provided, otherwise use vendor address
	const memecoinAddress = process.env.MEMECOIN_ADDRESS
		? AccountAddress.fromString(process.env.MEMECOIN_ADDRESS)
		: vendor.accountAddress;

	// Create test accounts
	const buyer = Account.generate();
	const targetAccount = Account.fromPrivateKey({
		privateKey: new Ed25519PrivateKey(
			"ed25519-priv-0x5611af1b78cfb21940fb44386b2a3b24a18af351a9a2ec5e960bee4ea607402e",
		),
	});

	console.log("\n=== Testing USDC Vendor ===");
	console.log(`Vendor: ${vendor.accountAddress.toString()}`);
	console.log(`Buyer: ${buyer.accountAddress.toString()}`);
	console.log(`Target: ${targetAccount.accountAddress.toString()}`);
	console.log(`Memecoin deployed at: ${memecoinAddress.toString()}`);

	// Fund test accounts
	await aptos.fundAccount({
		accountAddress: buyer.accountAddress,
		amount: 100_000_000,
	});

	// Register DoodooCoin for vendor and buyer
	console.log("\n=== Registering DoodooCoin ===");
	const vendorRegisterHash = await registerCoin(vendor, memecoinAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: vendorRegisterHash });

	const buyerRegisterHash = await registerCoin(buyer, memecoinAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: buyerRegisterHash });

	// Mint DoodooCoins to vendor
	console.log(`\n=== Minting ${DOODOO_COINS_TO_MINT} DoodooCoins to vendor ===`);
	const mintHash = await mintCoin(vendor, vendor.accountAddress, DOODOO_COINS_TO_MINT, memecoinAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: mintHash });

	// Transfer some DoodooCoins to target address
	console.log(`\n=== Transferring ${DOODOO_COINS_TO_TRANSFER} DoodooCoins to target address ===`);
	const targetAddr = AccountAddress.fromString(TARGET_ADDRESS);
	const transferHash = await transferCoin(vendor, targetAddr, DOODOO_COINS_TO_TRANSFER, memecoinAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: transferHash });

	// Check balances
	console.log("\n=== Checking balances ===");
	const vendorDoodooBalance = await getBalance(vendor.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");
	const buyerDoodooBalance = await getBalance(buyer.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");
	const targetDoodooBalance = await getBalance(targetAddr, memecoinAddress, "devnet_coins::DoodooCoin");

	console.log(`Vendor DoodooCoin balance: ${vendorDoodooBalance}`);
	console.log(`Buyer DoodooCoin balance: ${buyerDoodooBalance}`);
	console.log(`Target DoodooCoin balance: ${targetDoodooBalance}`);

	// Transfer some DoodooCoins from vendor to buyer for the vend operation
	console.log(`\n=== Transferring DoodooCoins to buyer for vend operation ===`);
	const buyerTransferHash = await transferCoin(vendor, buyer.accountAddress, 100, memecoinAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: buyerTransferHash });

	// Perform vend operation: buyer swaps DoodooCoin for DoraHacks USDC
	console.log(`\n=== Performing vend operation: ${USDC_TO_VEND} DoodooCoins for DoraHacks USDC ===`);
	try {
		const vendHash = await vendCoins(vendor, buyer, USDC_TO_VEND, USDC_TO_VEND, memecoinAddress, "devnet_coins::DoodooCoin");
		await aptos.waitForTransaction({ transactionHash: vendHash });
		console.log(`Vend operation successful! Hash: ${vendHash}`);
	} catch (error) {
		console.error("Vend operation failed:", error);
	}

	// Check final balances
	console.log("\n=== Final balances ===");
	const finalVendorDoodooBalance = await getBalance(vendor.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");
	const finalBuyerDoodooBalance = await getBalance(buyer.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");

	console.log(`Vendor DoodooCoin balance: ${finalVendorDoodooBalance}`);
	console.log(`Buyer DoodooCoin balance: ${finalBuyerDoodooBalance}`);

	// Get USDC fungible asset balance
	try {
		const usdcMetadataAddress = await getUsdcMetadataAddress(vendor.accountAddress);
		const vendorUsdcBalance = await getFungibleAssetBalance(vendor.accountAddress, usdcMetadataAddress);
		const buyerUsdcBalance = await getFungibleAssetBalance(buyer.accountAddress, usdcMetadataAddress);
		console.log(`Vendor USDC balance: ${vendorUsdcBalance}`);
		console.log(`Buyer USDC balance: ${buyerUsdcBalance}`);
	} catch (error) {
		console.log("Note: Could not fetch USDC balances - this is expected if vend operation failed.");
	}

	console.log("\n=== Testing completed! ===");
}

main().catch(console.error);
