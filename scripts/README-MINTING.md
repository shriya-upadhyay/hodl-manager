# DoodooCoin (Memecoin) Minting Scripts

This directory contains scripts for minting and managing DoodooCoin, your deployed memecoin on the Aptos blockchain.

## Prerequisites

1. **Environment Variables**: Create a `.env` file in the project root with:
   ```env
   DEPLOYER_PRIVATE_KEY=your_deployer_private_key_here
   MEMECOIN_ADDRESS=your_memecoin_contract_address_here
   APTOS_NETWORK=devnet
   ```

2. **Dependencies**: Make sure all npm dependencies are installed:
   ```bash
   npm install
   ```

## Available Scripts

### 1. Mint DoodooCoin (`mint:memecoin`)

Mints DoodooCoin tokens directly to a specified recipient address.

**Usage:**
```bash
npm run mint:memecoin <recipient_address> <amount>
```

**Example:**
```bash
npm run mint:memecoin 0xa33b58aa0d56f2ebde0b3c09fbcf6cdde1d2e5e6823ec74b0d9d8b297f15ed2e 1000
```

**Requirements:**
- The recipient account must exist on-chain (funded with at least some APT)
- The recipient must be registered to receive DoodooCoin (see registration script below)
- You must have minting permissions (be the deployer/owner)

### 2. Register for DoodooCoin (`register:memecoin`)

Registers an account to receive DoodooCoin tokens. This must be done before an account can receive DoodooCoin.

**Usage:**
```bash
npm run register:memecoin <account_private_key>
```

**Example:**
```bash
npm run register:memecoin 0x123...abc
```

**Note:** This requires the private key of the account that wants to receive DoodooCoin.

### 3. Test Vendor (`test:vendor`)

Comprehensive test script that demonstrates minting, transferring, and trading DoodooCoin.

**Usage:**
```bash
npm run test:vendor
```

## Complete Workflow Example

Here's a complete example of minting and sending DoodooCoin to a new recipient:

### Step 1: Set up environment variables
```bash
# .env file
DEPLOYER_PRIVATE_KEY=0x123...abc
MEMECOIN_ADDRESS=0xdef...456
APTOS_NETWORK=devnet
```

### Step 2: Fund the recipient account (if needed)
If the recipient account doesn't exist, they need to be funded first. The recipient can do this through the Aptos faucet or receive APT from another account.

### Step 3: Register the recipient for DoodooCoin
The recipient needs to register to receive DoodooCoin:
```bash
npm run register:memecoin 0x[recipient_private_key]
```

### Step 4: Mint DoodooCoin to the recipient
```bash
npm run mint:memecoin 0x[recipient_address] 1000
```

## Script Details

### Mint Script Features
- ✅ Direct minting to any address
- ✅ Input validation (address format, amount)
- ✅ Pre-mint checks (account exists, registration status)
- ✅ Balance reporting (before/after)
- ✅ Transaction confirmation
- ✅ Explorer link generation
- ✅ Detailed error messages

### Register Script Features
- ✅ Account registration for DoodooCoin
- ✅ Registration status checking
- ✅ Balance verification after registration
- ✅ Transaction confirmation
- ✅ Explorer link generation

## Coin Information

- **Name**: DOODOO Coin
- **Symbol**: DOODOO
- **Decimals**: 8
- **Type**: `HODLManager::devnet_coins::DoodooCoin`
- **Network**: Devnet (configurable)

## Troubleshooting

### Common Errors

1. **"ECOIN_STORE_NOT_PUBLISHED"**
   - The recipient hasn't registered for DoodooCoin
   - Solution: Run the register script first

2. **"Account does not exist on-chain"**
   - The recipient account hasn't been funded yet
   - Solution: Fund the account with APT first

3. **"Invalid recipient address format"**
   - The address format is incorrect
   - Solution: Ensure address starts with `0x` and is properly formatted

4. **Missing environment variables**
   - Required environment variables not set
   - Solution: Check your `.env` file has all required variables

### Getting Help

If you encounter issues:
1. Check the console output for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure the recipient account exists and is registered
4. Check the transaction on Aptos Explorer using the provided link

## Security Notes

- Never share your private keys
- Only use these scripts on testnets for development
- Always verify recipient addresses before minting
- Keep your `.env` file secure and never commit it to version control
