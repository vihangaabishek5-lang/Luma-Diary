# Privacy Policy — Luma Diary

**Version:** 2.0.0 · **Effective date:** October 14, 2026

This document describes the privacy behavior of the open-source Luma Diary application as implemented in version 2.0.0. Anyone publishing a modified version should revise the policy to match their distribution, services and obligations.

### 1. Information stored locally

Personal diary content, moods, tags, entry times, reminder times and appearance preferences are stored in a single encrypted local vault using AES-256-GCM. The encryption key is derived from the user's passphrase using scrypt and a random salt. The passphrase is not stored in the vault and is not sent to an app publisher server.

### 2. Google Drive is optional

If users opt in to Google Drive, the app uses a standard Google OAuth 2.0 browser flow, PKCE and `drive.appdata` permission. Encrypted diary snapshots are uploaded to an app-specific hidden storage area in the user's Google Drive account. The Google refresh token is retained **inside the encrypted local vault** to continue authorized syncing. The token is **excluded** from uploaded snapshots. Google independently processes account authentication, access logs and cloud metadata according to its own policies.

### 3. Notifications

Reminders use generic text; diary titles and bodies are never intentionally exposed in Windows notifications. Reminders are active only while Luma runs and the vault is unlocked, and are subject to the operating system's notification controls.

### 4. What the app does not intentionally do

The provided source does not send diary content to a Luma-operated analytics server, advertising network, third-party AI model or custom telemetry endpoint. The application does not require a Luma account. Public GitHub source code does not include user vaults. Users can use the diary entirely offline without Google integration.

### 5. Updates

The update-check button accesses the configured public GitHub repository's `releases/latest` API. GitHub can log ordinary request metadata (such as IP address) under its own policies. Update downloads/installations are user-initiated, not automatic.

### 6. Access, deletion and backups

Users control their local encrypted file and their Google account's app access. Deleting an entry stores a content-free deletion marker for synchronization. Copies of earlier data can remain in old backups, Google Drive file revisions, the user's external media or OS backups. Backup restoration saves a safety copy of the previous local vault; this old copy remains on the PC until the user removes it.

### 7. Limits and no absolute guarantee

Privacy is not absolute. Local malware, keylogging, a compromised device, a weak or stolen passphrase, distribution tampering, operating-system notification behaviors, conflicting cloud writes and Google-side account risks can compromise or lose information. The project has not received a professional security audit. Users should keep their OS up to date and avoid putting private backup files into public repositories.

### 8. Contact

For a public GitHub release, the maintainer should provide an appropriate support contact and a private security-reporting path via repository Security settings. No personal contact data is hard-coded into this starter release.
