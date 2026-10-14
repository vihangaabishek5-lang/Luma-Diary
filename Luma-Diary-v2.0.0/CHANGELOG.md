# Changelog

## 2.0.0 — Glass Rebuild (development preview)

- Rebuilt onboarding: Welcome → Get Started / Import existing diary → passphrase setup or unlock; no overwhelming first-screen password form.
- Rebuilt desktop UI in blue glassmorphism style with translucent white panels, compact search bar, consistent cards and custom logo.
- Seven main tabs: Home, Journal, Calendar, Explore, Reminders, Backup, Settings. Added Explore and Reminders views and Ctrl+K search.
- Added Home mini calendar with clickable dates; week streak visualization, functional recent entries and reminders.
- Added a locally encrypted optional display name used in the Home greeting.
- Added generated branding assets for app icon, installer icon, welcome screen and sidebar.
- Preserved prior Electron encryption, export/restore, Google Drive OAuth and legacy Native import implementation.
- GitHub Actions still builds an NSIS guided Windows setup (not a PowerShell installer).
- Automated tests pass in Linux; Windows end-to-end, Google OAuth and Defender/code-signing remain to be verified.

## 1.2.0

- Earlier Electron journal preview. See git history for full details.
