module HODLManager::devnet_coins {
    struct DoodooCoin {}

    fun init_module(sender: &signer) {
        aptos_framework::managed_coin::initialize<DoodooCoin>(
            sender,
            b"DOODOO Coin",
            b"DOODOO",
            8,
            false,
        );
    }
}
