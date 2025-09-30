script {
    fun register(account: &signer) {
        aptos_framework::managed_coin::register<HODLManager::devnet_coins::DoodooCoin>(account)
    }
}
