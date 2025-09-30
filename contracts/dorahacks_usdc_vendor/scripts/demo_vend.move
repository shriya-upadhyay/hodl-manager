script {
    /// Demo script showing how to use the vend function
    /// Buyer swaps DoodooCoin for DoraHacks USDC
    fun demo_vend_main<CoinType>(
        vendor: &signer,
        buyer: &signer,
        in_amount: u64,
        expected_out: u64,
    ) {
        // Register buyer for input coin if not already registered
        aptos_framework::managed_coin::register<CoinType>(buyer);

        // Perform the swap: buyer pays with input CoinType, receives DoraHacks USDC
        DoraHacks::usdc_vendor::vend<CoinType>(
            vendor,
            buyer,
            in_amount,
            expected_out,
        );
    }
}
