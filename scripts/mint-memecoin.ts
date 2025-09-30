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
 * This script mints DoodooCoin (memecoin) and sends it to a specified public address.
 *
 * Usage:
 * npm run mint-memecoin <recipient_address> <amount>
 *
 * Example:
 * npm run mint-memecoin 0xa33b58aa0d56f2ebde0b3c09fbcf6cdde1d2e5e6823ec74b0d9d8b297f15ed2e 1000
 *
 * Required environment variables:
 * - DEPLOYER_PRIVATE_KEY or VENDOR_PRIVATE_KEY: The private key of the memecoin deployer/minter
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

/** Get balance for a specific coin type */
const getBalance = async (accountAddress: AccountAddress, coinTypeAddress: AccountAddress, coinType: string) =>
	aptos.getBalance({
		accountAddress,
		asset: `${coinTypeAddress.toString()}::${coinType}`,
	});

/** Check if an account exists on-chain */
async function accountExists(address: AccountAddress): Promise<boolean> {
	try {
		await aptos.getAccountInfo({ accountAddress: address });
		return true;
	} catch (error) {
		return false;
	}
}

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
	if (args.length < 2) {
		console.error("Usage: npm run mint-memecoin <recipient_address> <amount>");
		console.error("Example: npm run mint-memecoin 0xa33b58aa0d56f2ebde0b3c09fbcf6cdde1d2e5e6823ec74b0d9d8b297f15ed2e 1000");
		process.exit(1);
	}

	const recipientAddressStr = args[0];
	const amount = parseInt(args[1]);

	// Validate inputs
	if (isNaN(amount) || amount <= 0) {
		console.error("Error: Amount must be a positive number");
		process.exit(1);
	}

	let recipientAddress: AccountAddress;
	try {
		recipientAddress = AccountAddress.fromString(recipientAddressStr);
	} catch (error) {
		console.error("Error: Invalid recipient address format");
		process.exit(1);
	}

	// Validate required environment variables
	const privateKey = process.env.DEPLOYER_PRIVATE_KEY || process.env.VENDOR_PRIVATE_KEY;
	if (!privateKey) {
		console.error("Error: DEPLOYER_PRIVATE_KEY or VENDOR_PRIVATE_KEY environment variable is required");
		process.exit(1);
	}

	// Load minter account from private key
	const minter = Account.fromPrivateKey({
		privateKey: new Ed25519PrivateKey(privateKey),
	});

	// Use memecoin address if provided, otherwise use minter address
	const memecoinAddress = process.env.MEMECOIN_ADDRESS
		? AccountAddress.fromString(process.env.MEMECOIN_ADDRESS)
		: minter.accountAddress;

	console.log("\n=== Minting DoodooCoin (Memecoin) ===");
	console.log(`Network: ${APTOS_NETWORK}`);
	console.log(`Minter: ${minter.accountAddress.toString()}`);
	console.log(`Memecoin deployed at: ${memecoinAddress.toString()}`);
	console.log(`Recipient: ${recipientAddress.toString()}`);
	console.log(`Amount to mint: ${amount} DOODOO`);

	// Check if recipient account exists
	const recipientExists = await accountExists(recipientAddress);
	if (!recipientExists) {
		console.error("Error: Recipient account does not exist on-chain");
		console.error("The recipient account must exist before minting coins to it");
		console.error("You can fund the account with APT first to create it");
		process.exit(1);
	}

	// Check if recipient is registered for DoodooCoin
	const isRegistered = await isRegisteredForCoin(recipientAddress, memecoinAddress, "devnet_coins::DoodooCoin");

	if (!isRegistered) {
		console.log("\n⚠️  Warning: Recipient is not registered for DoodooCoin");
		console.log("The recipient must register for DoodooCoin before receiving it");
		console.log("You can register using the following command:");
		console.log(`aptos move run --function-id 0x1::managed_coin::register --type-args ${memecoinAddress}::devnet_coins::DoodooCoin`);
		console.log("\nProceeding with mint anyway - the transaction will fail if recipient is not registered");
	}

	// Check minter's balance before minting
	const minterBalanceBefore = await getBalance(minter.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");
	console.log(`\nMinter balance before: ${minterBalanceBefore} DOODOO`);

	// Check recipient's balance before minting
	let recipientBalanceBefore = 0;
	if (isRegistered) {
		recipientBalanceBefore = await getBalance(recipientAddress, memecoinAddress, "devnet_coins::DoodooCoin");
		console.log(`Recipient balance before: ${recipientBalanceBefore} DOODOO`);
	}

	// Mint coins directly to recipient
	console.log(`\n=== Minting ${amount} DOODOO coins to recipient ===`);
	try {
		const mintHash = await mintCoin(
			minter,
			recipientAddress,
			amount,
			memecoinAddress,
			"devnet_coins::DoodooCoin"
		);

		console.log(`Mint transaction submitted: ${mintHash}`);
		console.log("Waiting for transaction confirmation...");

		await aptos.waitForTransaction({ transactionHash: mintHash });
		console.log("✅ Mint transaction confirmed!");

		// Check balances after minting
		console.log("\n=== Final Balances ===");
		const minterBalanceAfter = await getBalance(minter.accountAddress, memecoinAddress, "devnet_coins::DoodooCoin");
		console.log(`Minter balance after: ${minterBalanceAfter} DOODOO`);

		if (isRegistered) {
			const recipientBalanceAfter = await getBalance(recipientAddress, memecoinAddress, "devnet_coins::DoodooCoin");
			console.log(`Recipient balance after: ${recipientBalanceAfter} DOODOO`);
			console.log(`Tokens minted: ${recipientBalanceAfter - recipientBalanceBefore} DOODOO`);
		} else {
			console.log("Recipient balance: Cannot check (not registered)");
		}

		console.log("\n🎉 Minting completed successfully!");
		console.log(`Transaction hash: ${mintHash}`);
		console.log(`Explorer link: https://explorer.aptoslabs.com/txn/${mintHash}?network=${APTOS_NETWORK}`);

	} catch (error) {
		console.error("\n❌ Minting failed:", error);
		if (error instanceof Error && error.message.includes("ECOIN_STORE_NOT_PUBLISHED")) {
			console.error("\nThis error typically means the recipient hasn't registered for DoodooCoin yet.");
			console.error("Please ask the recipient to register first using:");
			console.error(`aptos move run --function-id 0x1::managed_coin::register --type-args ${memecoinAddress}::devnet_coins::DoodooCoin`);
		}
		process.exit(1);
	}
}

main().catch(console.error);
