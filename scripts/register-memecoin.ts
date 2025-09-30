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
 * This script registers an account to receive DoodooCoin (memecoin).
 * This must be done before an account can receive DoodooCoin tokens.
 *
 * Usage:
 * npm run register-memecoin <account_private_key>
 *
 * Example:
 * npm run register-memecoin 0x123...abc
 *
 * Required environment variables:
 * - MEMECOIN_ADDRESS: The address where the memecoin was deployed (optional, defaults to deployer address)
 * - APTOS_NETWORK: The network to use (optional, defaults to devnet)
 */

// Set up the client
const APTOS_NETWORK: Network = NetworkToNetworkName[process.env.APTOS_NETWORK ?? Network.DEVNET];
const config = new AptosConfig({ network: APTOS_NETWORK });
const aptos = new Aptos(config);

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

/** Get balance for a specific coin type */
const getBalance = async (accountAddress: AccountAddress, coinTypeAddress: AccountAddress, coinType: string) =>
	aptos.getBalance({
		accountAddress,
		asset: `${coinTypeAddress.toString()}::${coinType}`,
	});

/** Check if account is registered for a specific coin type */
async function isRegisteredForCoin(
	accountAddress: AccountAddress,
	coinTypeAddress: AccountAddress,
	coinType: string
): Promise<boolean> {
	try {
		await getBalance(accountAddress, coinTypeAddress, coinType);
		return true;
	} catch (error) {
		return false;
	}
}

async function main() {
	// Parse command line arguments
	const args = process.argv.slice(2);
	if (args.length < 1) {
		console.error("Usage: npm run register-memecoin <account_private_key>");
		console.error("Example: npm run register-memecoin 0x123...abc");
		process.exit(1);
	}

	const privateKeyStr = args[0];

	// Validate inputs
	let privateKey: Ed25519PrivateKey;
	try {
		privateKey = new Ed25519PrivateKey(privateKeyStr);
	} catch (error) {
		console.error("Error: Invalid private key format");
		process.exit(1);
	}

	// Load account from private key
	const account = Account.fromPrivateKey({ privateKey });

	// Use memecoin address if provided, otherwise use a default address
	const memecoinAddress = process.env.MEMECOIN_ADDRESS
		? AccountAddress.fromString(process.env.MEMECOIN_ADDRESS)
		: account.accountAddress; // fallback to account address

	console.log("\n=== Registering Account for DoodooCoin (Memecoin) ===");
	console.log(`Network: ${APTOS_NETWORK}`);
	console.log(`Account: ${account.accountAddress.toString()}`);
	console.log(`Memecoin deployed at: ${memecoinAddress.toString()}`);

	// Check if already registered
	const isAlreadyRegistered = await isRegisteredForCoin(account.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");

	if (isAlreadyRegistered) {
		console.log("\n✅ Account is already registered for DoodooCoin!");
		const balance = await getBalance(account.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");
		console.log(`Current DOODOO balance: ${balance}`);
		return;
	}

	// Register for DoodooCoin
	console.log("\n=== Registering for DoodooCoin ===");
	try {
		const registerHash = await registerCoin(account, memecoinAddress, "devnet_coins::DoodooCoin");

		console.log(`Registration transaction submitted: ${registerHash}`);
		console.log("Waiting for transaction confirmation...");

		await aptos.waitForTransaction({ transactionHash: registerHash });
		console.log("✅ Registration transaction confirmed!");

		// Verify registration
		const isNowRegistered = await isRegisteredForCoin(account.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");
		if (isNowRegistered) {
			console.log("\n🎉 Successfully registered for DoodooCoin!");
			const balance = await getBalance(account.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");
			console.log(`Current DOODOO balance: ${balance}`);
		} else {
			console.log("\n⚠️  Registration may not have completed properly");
		}

		console.log(`Transaction hash: ${registerHash}`);
		console.log(`Explorer link: https://explorer.aptoslabs.com/txn/${registerHash}?network=${APTOS_NETWORK}`);

	} catch (error) {
		console.error("\n❌ Registration failed:", error);
		process.exit(1);
	}
}

main().catch(console.error);
