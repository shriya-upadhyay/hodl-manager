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
import { compilePackage, getPackageBytesToPublish } from "./utils";

/**
 * This example demonstrates how to use the DoraHacks USDC Vendor contract.
 * It shows how to:
 * 1. Publish the vendor module
 * 2. Initialize the vendor
 * 3. Register and mint DoodooCoins
 * 4. Transfer coins to a target address
 * 5. Use the vend function to swap DoodooCoin for DoraHacks USDC
 *
 * Before running this example, we should compile the package locally:
 * 1. Acquire the Aptos CLI, see https://aptos.dev/tools/aptos-cli/
 * 2. cd `~/aptos-ts-sdk/examples/typescript`
 * 3. Run `pnpm run dorahacks_usdc_vendor`
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

/** Initialize the USDC vendor */
async function initializeVendor(vendor: Account): Promise<string> {
	const transaction = await aptos.transaction.build.simple({
		sender: vendor.accountAddress,
		data: {
			function: `${vendor.accountAddress}::usdc_vendor::init`,
			typeArguments: [],
			functionArguments: [],
		},
	});

	const senderAuthenticator = aptos.transaction.sign({ signer: vendor, transaction });
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
	const transaction = await aptos.transaction.build.simple({
		sender: buyer.accountAddress,
		data: {
			function: `${vendor.accountAddress}::usdc_vendor::vend`,
			typeArguments: [`${coinTypeAddress}::${coinType}`],
			functionArguments: [inAmount, expectedOut],
		},
	});

	// This requires both vendor and buyer to sign (multi-agent transaction)
	const vendorAuthenticator = aptos.transaction.sign({ signer: vendor, transaction });
	const buyerAuthenticator = aptos.transaction.sign({ signer: buyer, transaction });

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
	// Create accounts
	const vendor = Account.generate();
	const buyer = Account.generate();
	const targetAccount = Account.fromPrivateKey({
		privateKey: new Ed25519PrivateKey(
			"ed25519-priv-0x5611af1b78cfb21940fb44386b2a3b24a18af351a9a2ec5e960bee4ea607402e",
		),
	});

	console.log("\n=== Addresses ===");
	console.log(`Vendor: ${vendor.accountAddress.toString()}`);
	console.log(`Buyer: ${buyer.accountAddress.toString()}`);
	console.log(`Target: ${targetAccount.accountAddress.toString()}`);

	// Fund accounts
	await aptos.fundAccount({
		accountAddress: vendor.accountAddress,
		amount: 100_000_000,
	});

	await aptos.fundAccount({
		accountAddress: buyer.accountAddress,
		amount: 100_000_000,
	});

	// Compile packages
	console.log("\n=== Compiling packages locally ===");

	// Compile the USDC vendor package
	compilePackage("contracts/dorahacks_usdc_vendor", "contracts/dorahacks_usdc_vendor/dorahacks_usdc_vendor.json", [
		{ name: "DoraHacks", address: vendor.accountAddress },
		{ name: "HODLManager", address: vendor.accountAddress },
	]);

	// Compile the DoodooCoin package
	compilePackage("contracts/dorahacksCoins", "contracts/dorahacksCoins/dorahacksCoins.json", [
		{ name: "HODLManager", address: vendor.accountAddress }
	]);

	// Publish USDC vendor package
	console.log(`\n=== Publishing USDC Vendor package to ${aptos.config.network} network ===`);
	const { metadataBytes: vendorMetadataBytes, byteCode: vendorByteCode } = getPackageBytesToPublish("contracts/dorahacks_usdc_vendor/dorahacks_usdc_vendor.json");

	const vendorPublishTransaction = await aptos.publishPackageTransaction({
		account: vendor.accountAddress,
		metadataBytes: vendorMetadataBytes,
		moduleBytecode: vendorByteCode,
	});

	const vendorPendingTransaction = await aptos.signAndSubmitTransaction({
		signer: vendor,
		transaction: vendorPublishTransaction,
	});

	console.log(`Vendor package transaction hash: ${vendorPendingTransaction.hash}`);
	await aptos.waitForTransaction({ transactionHash: vendorPendingTransaction.hash });

	// Publish DoodooCoin package
	console.log(`\n=== Publishing DoodooCoin package to ${aptos.config.network} network ===`);
	const { metadataBytes: coinMetadataBytes, byteCode: coinByteCode } = getPackageBytesToPublish("contracts/dorahacksCoins/dorahacksCoins.json");

	const coinPublishTransaction = await aptos.publishPackageTransaction({
		account: vendor.accountAddress,
		metadataBytes: coinMetadataBytes,
		moduleBytecode: coinByteCode,
	});

	const coinPendingTransaction = await aptos.signAndSubmitTransaction({
		signer: vendor,
		transaction: coinPublishTransaction,
	});

	console.log(`DoodooCoin package transaction hash: ${coinPendingTransaction.hash}`);
	await aptos.waitForTransaction({ transactionHash: coinPendingTransaction.hash });

	// Initialize the vendor
	console.log("\n=== Initializing USDC Vendor ===");
	const initHash = await initializeVendor(vendor);
	await aptos.waitForTransaction({ transactionHash: initHash });
	console.log("Vendor initialized successfully!");

	// Register DoodooCoin for vendor and buyer
	console.log("\n=== Registering DoodooCoin ===");
	const vendorRegisterHash = await registerCoin(vendor, vendor.accountAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: vendorRegisterHash });

	const buyerRegisterHash = await registerCoin(buyer, vendor.accountAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: buyerRegisterHash });

	// Mint DoodooCoins to vendor
	console.log(`\n=== Minting ${DOODOO_COINS_TO_MINT} DoodooCoins to vendor ===`);
	const mintHash = await mintCoin(vendor, vendor.accountAddress, DOODOO_COINS_TO_MINT, vendor.accountAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: mintHash });

	// Transfer some DoodooCoins to target address
	console.log(`\n=== Transferring ${DOODOO_COINS_TO_TRANSFER} DoodooCoins to target address ===`);
	const targetAddr = AccountAddress.fromString(TARGET_ADDRESS);
	const transferHash = await transferCoin(vendor, targetAddr, DOODOO_COINS_TO_TRANSFER, vendor.accountAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: transferHash });

	// Check balances
	console.log("\n=== Checking balances ===");
	const vendorDoodooBalance = await getBalance(vendor.accountAddress, vendor.accountAddress, "devnet_coins::DoodooCoin");
	const buyerDoodooBalance = await getBalance(buyer.accountAddress, vendor.accountAddress, "devnet_coins::DoodooCoin");
	const targetDoodooBalance = await getBalance(targetAddr, vendor.accountAddress, "devnet_coins::DoodooCoin");

	console.log(`Vendor DoodooCoin balance: ${vendorDoodooBalance}`);
	console.log(`Buyer DoodooCoin balance: ${buyerDoodooBalance}`);
	console.log(`Target DoodooCoin balance: ${targetDoodooBalance}`);

	// Transfer some DoodooCoins from vendor to buyer for the vend operation
	console.log(`\n=== Transferring DoodooCoins to buyer for vend operation ===`);
	const buyerTransferHash = await transferCoin(vendor, buyer.accountAddress, 100, vendor.accountAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: buyerTransferHash });

	// Perform vend operation: buyer swaps DoodooCoin for DoraHacks USDC
	console.log(`\n=== Performing vend operation: ${USDC_TO_VEND} DoodooCoins for DoraHacks USDC ===`);
	const vendHash = await vendCoins(vendor, buyer, USDC_TO_VEND, USDC_TO_VEND, vendor.accountAddress, "devnet_coins::DoodooCoin");
	await aptos.waitForTransaction({ transactionHash: vendHash });

	// Check final balances
	console.log("\n=== Final balances ===");
	const finalVendorDoodooBalance = await getBalance(vendor.accountAddress, vendor.accountAddress, "devnet_coins::DoodooCoin");
	const finalBuyerDoodooBalance = await getBalance(buyer.accountAddress, vendor.accountAddress, "devnet_coins::DoodooCoin");

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
		console.log("Note: Could not fetch USDC balances yet.");
	}

	console.log("\n=== All operations completed successfully! ===");
}

main().catch(console.error);
