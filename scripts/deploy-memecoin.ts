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
 * This script deploys the DoodooCoin memecoin contract.
 * It compiles and publishes the DoraHacks memecoin package.
 *
 * Usage:
 * - Run without arguments to generate a new deployer account
 * - Set DEPLOYER_PRIVATE_KEY environment variable to use an existing account
 */

// Set up the client
const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

async function main() {
	// Create or load deployer account
	const deployer = process.env.DEPLOYER_PRIVATE_KEY
		? Account.fromPrivateKey({ privateKey: new Ed25519PrivateKey(process.env.DEPLOYER_PRIVATE_KEY) })
		: Account.generate();

	console.log("\n=== Memecoin Deployment ===");
	console.log(`Deployer: ${deployer.accountAddress.toString()}`);

	// Fund deployer account
	await aptos.fundAccount({
		accountAddress: deployer.accountAddress,
		amount: 100_000_000,
	});

	// Compile the DoodooCoin package
	console.log("\n=== Compiling DoodooCoin package ===");
	compilePackage("contracts/dorahacksCoins", "contracts/dorahacksCoins/dorahacksCoins.json", [
		{ name: "HODLManager", address: deployer.accountAddress }
	]);

	// Publish DoodooCoin package
	console.log(`\n=== Publishing DoodooCoin package to ${aptos.config.network} network ===`);
	const { metadataBytes: coinMetadataBytes, byteCode: coinByteCode } = getPackageBytesToPublish("contracts/dorahacksCoins/dorahacksCoins.json");

	const coinPublishTransaction = await aptos.publishPackageTransaction({
		account: deployer.accountAddress,
		metadataBytes: coinMetadataBytes,
		moduleBytecode: coinByteCode,
	});

	const coinPendingTransaction = await aptos.signAndSubmitTransaction({
		signer: deployer,
		transaction: coinPublishTransaction,
	});

	console.log(`DoodooCoin package transaction hash: ${coinPendingTransaction.hash}`);
	await aptos.waitForTransaction({ transactionHash: coinPendingTransaction.hash });

	console.log("\n=== Memecoin deployment completed successfully! ===");
	console.log(`Deployer address: ${deployer.accountAddress.toString()}`);
	if (!process.env.DEPLOYER_PRIVATE_KEY) {
		console.log(`Private key: ${deployer.privateKey.toString()}`);
		console.log("Save this private key to use in other scripts!");
	}
}

main().catch(console.error);
