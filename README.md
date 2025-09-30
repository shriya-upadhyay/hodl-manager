This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Deploying Move modules (USDC Vendor & MemeCoin)

This repo includes two Aptos Move packages under `contracts/`:

- `contracts/dorahacks_usdc_vendor` – module `DoraHacks::usdc_vendor`
- `contracts/dorahacksCoins` – module `HODLManager::devnet_coins` with `DoodooCoin`

### Prerequisites

- Install the Aptos CLI: `https://aptos.dev/cli-tools/aptos-cli/`
- Create or select an Aptos account (profile) and set the network (e.g., devnet):

```bash
aptos init --network devnet --profile default
```

Copy your account address from the init output and substitute it for `<PUBLISHER_ADDR>` below (often the same address acts as both `DoraHacks` and `HODLManager`).

### 1) Publish USDC Vendor

```bash
cd contracts/dorahacks_usdc_vendor

# Publish with named addresses (point both to your publisher address)
aptos move publish \
  --named-addresses DoraHacks=<PUBLISHER_ADDR>,HODLManager=<PUBLISHER_ADDR> \
  --assume-yes --profile default

# Initialize the vendor module (runs once after publish)
aptos move run \
  --function <PUBLISHER_ADDR>::usdc_vendor::init \
  --profile default

# (Optional) View the USDC metadata object address
aptos view --function <PUBLISHER_ADDR>::usdc_vendor::get_metadata_address --profile default
```

### 2) Publish MemeCoin (DoodooCoin)

`HODLManager::devnet_coins` defines `DoodooCoin` and initializes during module publish via `init_module`.

```bash
cd ../dorahacksCoins

aptos move publish \
  --named-addresses HODLManager=<PUBLISHER_ADDR> \
  --assume-yes --profile default
```

### 3) (Optional) Register, Mint, and Transfer `DoodooCoin`

Register the coin for your publisher account (needed before holding/transferring ManagedCoin):

```bash
aptos move run \
  --function 0x1::managed_coin::register \
  --type-args <PUBLISHER_ADDR>::devnet_coins::DoodooCoin \
  --profile default
```

Mint to any address (requires the publisher/admin to sign):

```bash
aptos move run \
  --function 0x1::managed_coin::mint \
  --type-args <PUBLISHER_ADDR>::devnet_coins::DoodooCoin \
  --args address:<TO_ADDR> u64:1000000 \
  --profile default
```

Transfer coins:

```bash
aptos move run \
  --function 0x1::aptos_account::transfer_coins \
  --type-args <PUBLISHER_ADDR>::devnet_coins::DoodooCoin \
  --args address:<TO_ADDR> u64:1000 \
  --profile default
```

## TypeScript Deployment Scripts

This project includes TypeScript scripts for automated deployment and testing using the Aptos TS SDK. These scripts provide a more streamlined workflow than the manual CLI commands above.

### Available Scripts

- `npm run deploy:memecoin` - Deploy the DoodooCoin memecoin contract
- `npm run deploy:vendor` - Deploy the USDC Vendor contract
- `npm run test:vendor` - Test the deployed contracts with minting, transferring, and vending operations

### Usage Workflow

#### 1. Deploy Memecoin

```bash
# Generate a new deployer account
npm run deploy:memecoin

# Or use an existing account
DEPLOYER_PRIVATE_KEY="your_private_key" npm run deploy:memecoin
```

This will:
- Use existing account (if `DEPLOYER_PRIVATE_KEY` provided) or generate new one
- Compile and publish the DoodooCoin package
- Output the deployer address and private key (if generated)

**Save the private key from the output to use for the vendor deployment!**

#### 2. Deploy USDC Vendor

```bash
# Using the same account as memecoin deployer (recommended)
DEPLOYER_PRIVATE_KEY="your_memecoin_deployer_private_key" npm run deploy:vendor

# Or generate a new vendor account
npm run deploy:vendor
```

This will:
- Use existing account (if `DEPLOYER_PRIVATE_KEY` provided) or generate new one
- Compile and publish the USDC Vendor package
- Initialize the vendor contract
- Output the vendor address and private key (if generated)

#### 3. Test the Deployed Contracts

```bash
# Using the same deployer account
DEPLOYER_PRIVATE_KEY="your_deployer_private_key" npm run test:vendor

# Or if using different accounts
VENDOR_PRIVATE_KEY="your_vendor_private_key" MEMECOIN_ADDRESS="memecoin_deployer_address" npm run test:vendor
```

This will:

- Register DoodooCoin for test accounts
- Mint tokens to the vendor
- Transfer tokens to test addresses
- Perform vend operations (swap DoodooCoin for USDC)
- Display final balances

### Environment Variables

- `DEPLOYER_PRIVATE_KEY` - Private key to use for deployments (recommended for consistent deployer)
- `VENDOR_PRIVATE_KEY` - Alternative to DEPLOYER_PRIVATE_KEY for backward compatibility
- `MEMECOIN_ADDRESS` - Optional for test:vendor (defaults to vendor address)
- `APTOS_NETWORK` - Network to deploy to (defaults to devnet)

### Notes

- The `vend` entry in `usdc_vendor` is a multi‑agent transaction (buyer + vendor). For a complete end‑to‑end demo (including vend), you can wire this up with the Aptos TS SDK. A sample script exists at `scripts/dorahacks_usdc_vendor.ts` (devnet by default). If you use it, ensure the paths to the Move packages match this repo structure under `contracts/` and that you have the Aptos CLI installed for local compilation.
