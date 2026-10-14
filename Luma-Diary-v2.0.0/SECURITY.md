# Security Policy — Luma Diary

## Supported releases

Developer preview: `2.0.0`. This version is provided as open-source starter software. It has **not** had an independent professional penetration test or Windows 11 end-to-end release qualification.

## Threat model / What is protected

- At rest: encrypted vault files protect diary text against straightforward reading of the file without the correct passphrase.
- In transit: Google OAuth and Drive API calls use HTTPS; the uploaded payload is also encrypted before transmission.
- Google API permissions: scoped to the per-app `appDataFolder` rather than full Drive read/write access.
- GUI renderer: context isolation, sandbox and a narrow preload IPC bridge reduce exposure to untrusted content.
- Notifications: generic body text minimizes diary details in OS notification previews.
- User input: diary text is rendered using DOM `textContent`, not executed as HTML.

## What is *not* guaranteed

- Protection from spyware, memory dump attacks, keyloggers or privileged malware on an unlocked machine.
- Recovery if the passphrase is forgotten.
- Perfect real-time multi-device conflict resolution; merge currently favors the latest `updatedAt` timestamp per entry. Concurrent edits can be overwritten.
- Reminders while Luma is fully closed, Windows notifications are turned off or the diary is locked.
- Public OAuth sign-in to work until the developer has configured Google publishing/verification requirements.
- Installer trust warnings to disappear without a reputable signing setup.
- Secure automatic silent updates. The current version **does not auto-install updates**.

## Build and release recommendations

1. Pin dependencies with a lockfile from a trusted Windows build (`npm install` generates `package-lock.json`; commit it for reproducibility).
2. Run `npm test` and a manual test matrix for create/edit/delete, reminders, Google login, sync/restore, offline failures and clean reinstall.
3. Regularly update Electron and other dependencies with security fixes.
4. Consider Windows Authenticode code signing before wide public distribution.
5. Keep Google API scopes minimal and never distribute client secrets or refresh tokens.
6. Review GitHub Action dependencies and enable protected branches/releases.
7. Provide users with clear warnings about passphrase loss, conflicts and restore semantics.

## Reporting vulnerabilities

Do not post actual diary backups, secrets or personal data in public GitHub issues. Repository maintainers should enable **GitHub → Settings → Security → Private vulnerability reporting** before public launch.
