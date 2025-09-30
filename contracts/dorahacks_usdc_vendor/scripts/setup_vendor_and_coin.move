script {
    use aptos_framework::managed_coin;
    use aptos_framework::coin;
    use std::signer;

    /// Setup script that:
    /// 1. Initializes the vendor (assumes vendor module is already published)
    /// 2. Registers the DoodooCoin for the vendor
    /// 3. Mints coins to the vendor's address
    /// 4. Transfers some coins to the target address
    fun setup_vendor_and_coin_main<CoinType>(
        vendor: &signer,
        mint_amount: u64,
        transfer_amount: u64,
    ) {
        let vendor_addr = signer::address_of(vendor);
        let target_addr = @0xa33b58aa0d56f2ebde0b3c09fbcf6cdde1d2e5e6823ec74b0d9d8b297f15ed2e;

        // 1. Initialize the vendor (this creates the DoraHacks USDC fungible asset)
        DoraHacks::usdc_vendor::init(vendor);

        // 2. Register the DoodooCoin for the vendor so they can receive it
        managed_coin::register<CoinType>(vendor);

        // 3. Mint DoodooCoins to the vendor's address
        // Note: This assumes the vendor has minting capabilities for DoodooCoin
        // In practice, you'd need to call this from the coin's admin
        managed_coin::mint<CoinType>(
            vendor,
            vendor_addr,
            mint_amount,
        );

        // 4. Transfer some DoodooCoins to the target address
        coin::transfer<CoinType>(
            vendor,
            target_addr,
            transfer_amount,
        );
    }
}
