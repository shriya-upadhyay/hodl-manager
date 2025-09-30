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
 * This script deploys the USDC Vendor contract.
 * It compiles and publishes the DoraHacks USDC Vendor package and initializes it.
 *
 * Usage:
 * - Run without arguments to generate a new vendor account
 * - Set VENDOR_PRIVATE_KEY environment variable to use an existing account
 */

// Set up the client
const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

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

async function main() {
	// Create or load vendor account
	const vendor = process.env.VENDOR_PRIVATE_KEY
		? Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(process.env.VENDOR_PRIVATE_KEY) })
		: Account.generate();

	console.log("\n=== USDC Vendor Deployment ===");
	console.log(`Vendor: ${vendor.accountAddress.toString()}`);

	// Fund vendor account
	await aptos.fundAccount({
		accountAddress: vendor.accountAddress,
		amount: 100_000_000,
	});

	// Compile the USDC vendor package
	console.log("\n=== Compiling USDC Vendor package ===");
	compilePackage("contracts/dorahacks_usdc_vendor", "contracts/dorahacks_usdc_vendor/dorahacks_usdc_vendor.json", [
		{ name: "DoraHacks", address: vendor.accountAddress },
		{ name: "HODLManager", address: vendor.accountAddress },
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

	// Initialize the vendor
	console.log("\n=== Initializing USDC Vendor ===");
	const initHash = await initializeVendor(vendor);
	await aptos.waitForTransaction({ transactionHash: initHash });
	console.log(`Vendor initialization hash: ${initHash}`);

	console.log("\n=== USDC Vendor deployment completed successfully! ===");
	console.log(`Vendor address: ${vendor.accountAddress.toString()}`);
	if (!process.env.VENDOR_PRIVATE_KEY) {
		console.log(`Private key: ${vendor.privateKey.toString()}`);
		console.log("Save this private key to use in other scripts!");
	}
}

main().catch(console.error);
