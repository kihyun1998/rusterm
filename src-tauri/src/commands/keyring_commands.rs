use keyring::Entry;

/// Save credential to OS keychain
///
/// # Arguments
/// * `service` - Service name (e.g., "rusterm-ssh")
/// * `account` - Account name (e.g., "profile-id-password")
/// * `secret` - Secret to store (password, private key, or passphrase)
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` on failure
#[tauri::command]
pub async fn save_credential(
    service: String,
    account: String,
    secret: String,
) -> Result<(), String> {
    println!("[Rust] save_credential called with service='{}', account='{}'", service, account);

    let entry = Entry::new(&service, &account)
        .map_err(|e| {
            let err = format!("Failed to create keyring entry: {}", e);
            println!("[Rust] Error creating entry: {}", err);
            err
        })?;

    println!("[Rust] Created keyring entry, calling set_password");
    entry
        .set_password(&secret)
        .map_err(|e| {
            let err = format!("Failed to save credential: {}", e);
            println!("[Rust] Error saving: {}", err);
            err
        })?;

    println!("[Rust] Successfully saved credential");
    Ok(())
}

/// Get credential from OS keychain
///
/// # Arguments
/// * `service` - Service name (e.g., "rusterm-ssh")
/// * `account` - Account name (e.g., "profile-id-password")
///
/// # Returns
/// * `Ok(String)` with the secret on success
/// * `Err(String)` if credential not found or access fails
#[tauri::command]
pub async fn get_credential(service: String, account: String) -> Result<String, String> {
    println!("[Rust] get_credential called with service='{}', account='{}'", service, account);

    let entry = Entry::new(&service, &account)
        .map_err(|e| {
            let err = format!("Failed to create keyring entry: {}", e);
            println!("[Rust] Error creating entry: {}", err);
            err
        })?;

    println!("[Rust] Created keyring entry, calling get_password");
    let result = entry
        .get_password()
        .map_err(|e| {
            let err = format!("Credential not found: {}", e);
            println!("[Rust] Error retrieving: {}", err);
            err
        })?;

    println!("[Rust] Successfully retrieved credential (length: {})", result.len());
    Ok(result)
}

/// Delete credential from OS keychain
///
/// # Arguments
/// * `service` - Service name (e.g., "rusterm-ssh")
/// * `account` - Account name (e.g., "profile-id-password")
///
/// # Returns
/// * `Ok(())` on success
/// * `Err(String)` on failure
#[tauri::command]
pub async fn delete_credential(service: String, account: String) -> Result<(), String> {
    let entry = Entry::new(&service, &account)
        .map_err(|e| format!("Failed to create keyring entry: {}", e))?;

    entry
        .delete_credential()
        .map_err(|e| format!("Failed to delete credential: {}", e))?;

    Ok(())
}
