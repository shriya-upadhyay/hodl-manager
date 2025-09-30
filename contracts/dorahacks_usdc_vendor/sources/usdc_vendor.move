module DoraHacks::usdc_vendor {
    use aptos_framework::fungible_asset::{Self, MintRef, TransferRef, BurnRef, Metadata};
    use aptos_framework::object::{Self, Object};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::coin;
    use std::error;
    use std::signer;
    use std::string::utf8;
    use std::option;

    const ENOT_OWNER: u64 = 1;
    const EINVALID_RETURN_AMOUNT: u64 = 2;

    const ASSET_NAME: vector<u8> = b"DoraHacks USDC";
    const ASSET_SYMBOL: vector<u8> = b"USDC";

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct ManagedFungibleAsset has key {
        mint_ref: MintRef,
        transfer_ref: TransferRef,
        burn_ref: BurnRef,
    }

    /// Initialize metadata object and store the refs for DoraHacks USDC.
    fun init_module(admin: &signer) {
        let constructor_ref = &object::create_named_object(admin, ASSET_SYMBOL);
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            utf8(ASSET_NAME),
            utf8(ASSET_SYMBOL),
            6,
            utf8(b"https://example.com/icon.png"),
            utf8(b"https://example.com"),
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(constructor_ref);
        let metadata_object_signer = object::generate_signer(constructor_ref);
        move_to(
            &metadata_object_signer,
            ManagedFungibleAsset { mint_ref, transfer_ref, burn_ref }
        )
    }

    /// Public entry to initialize the asset after publishing this module.
    public entry fun init(admin: &signer) {
        let asset_address = object::create_object_address(&@DoraHacks, ASSET_SYMBOL);
        if (!exists<ManagedFungibleAsset>(asset_address)) {
            init_module(admin)
        }
    }

    #[view]
    public fun get_metadata(): Object<Metadata> {
        let asset_address = object::create_object_address(&@DoraHacks, ASSET_SYMBOL);
        object::address_to_object<Metadata>(asset_address)
    }

    #[view]
    public fun get_metadata_address(): address {
        object::object_address(&get_metadata())
    }

    /// Buyer pays with any CoinType and receives expected_out of DoraHacks USDC.
    /// Requires vendor (asset owner) to co-sign to authorize minting.
    /// The primary signer (sender) is the buyer; the secondary signer is the vendor.
    public entry fun vend<CoinType>(
        buyer: &signer,
        vendor: &signer,
        in_amount: u64,
        expected_out: u64
    ) acquires ManagedFungibleAsset {
        assert!(expected_out > 0, error::invalid_argument(EINVALID_RETURN_AMOUNT));

        // Collect input payment from buyer to vendor.
        coin::transfer<CoinType>(buyer, signer::address_of(vendor), in_amount);

        // Mint and deposit the expected amount of DoraHacks USDC to buyer.
        let asset = get_metadata();
        let managed = authorized_borrow_refs(vendor, asset);
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(signer::address_of(buyer), asset);
        let fa = fungible_asset::mint(&managed.mint_ref, expected_out);
        fungible_asset::deposit_with_ref(&managed.transfer_ref, to_wallet, fa);
    }

    /// Mint DoraHacks USDC directly to an address (admin only)
    public entry fun mint_to(
        admin: &signer,
        to: address,
        amount: u64
    ) acquires ManagedFungibleAsset {
        let asset = get_metadata();
        let managed = authorized_borrow_refs(admin, asset);
        let to_wallet = primary_fungible_store::ensure_primary_store_exists(to, asset);
        let fa = fungible_asset::mint(&managed.mint_ref, amount);
        fungible_asset::deposit_with_ref(&managed.transfer_ref, to_wallet, fa);
    }

    inline fun authorized_borrow_refs(
        owner: &signer,
        asset: Object<Metadata>,
    ): &ManagedFungibleAsset {
        assert!(object::is_owner(asset, signer::address_of(owner)), error::permission_denied(ENOT_OWNER));
        borrow_global<ManagedFungibleAsset>(object::object_address(&asset))
    }
}
