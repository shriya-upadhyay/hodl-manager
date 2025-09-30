script {
    use aptos_framework::code;
    use aptos_framework::managed_coin;
    use aptos_framework::coin;
    use std::vector;

    /// Deploy the vendor module, deploy the coin module, mint coins to vendor, and transfer some to target address
    fun deploy_and_setup_main<CoinType>(
        deployer: &signer,
        vendor_bytecode: vector<u8>,
        coin_bytecode: vector<u8>,
        mint_amount: u64,
        transfer_amount: u64,
    ) {
        let deployer_addr = std::signer::address_of(deployer);

        // 1. Publish the vendor module
        code::publish_package_txn(
            deployer,
            vendor_bytecode,
            vector::empty(),
        );

        // 2. Publish the coin module (assuming it's a separate package)
        code::publish_package_txn(
            deployer,
            coin_bytecode,
            vector::empty(),
        );

        // 3. Initialize the vendor (assuming the vendor module has an init function)
        DoraHacks::usdc_vendor::init(deployer);

        // 4. Register the coin for the vendor
        managed_coin::register<CoinType>(deployer);

        // 5. Mint coins to the vendor's address
        managed_coin::mint<CoinType>(
            deployer,
            deployer_addr,
            mint_amount,
        );

        // 6. Transfer some coins to the target address
        let target_addr = @0xa33b58aa0d56f2ebde0b3c09fbcf6cdde1d2e5e6823ec74b0d9d8b297f15ed2e;
        coin::transfer<CoinType>(
            deployer,
            target_addr,
            transfer_amount,
        );
    }
}
