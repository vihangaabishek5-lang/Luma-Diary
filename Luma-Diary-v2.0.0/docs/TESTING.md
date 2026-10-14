# Luma Diary v2.0.0 — Windows Test Checklist

- [ ] NSIS Setup.exe opens Windows install wizard, not PowerShell; Desktop and Start shortcut display new Luma icon.
- [ ] Clean start: Welcome screen displays; Get Started opens setup passphrase; the diary opens.
- [ ] Restart: Welcome Back unlock with correct password, wrong password denied; vault not overwritten.
- [ ] Create, edit, delete, search, date, tag and mood; close unsaved editor prompts.
- [ ] Home calendar days, Journal, Calendar, Explore, Reminders, Backup, Settings tabs work.
- [ ] Ctrl+K search; Ctrl+N new entry; Ctrl+S save; Esc close with unsaved warning.
- [ ] Themes including custom color saved after restart.
- [ ] Generic reminder notification fires only while app is running and unlocked (Windows notification settings permitting).
- [ ] Export encrypted local backup, restore with passphrase on separate test account; bad passphrase denied.
- [ ] Native v1.1 importer preserves original vault (test using a COPY; never production data first).
- [ ] Google OAuth desktop PKCE connect, encrypted sync, backup restore and re-connect after restart using a test Google account.
- [ ] Update from v1.2 Electron with backup — existing entries available in v2, no data loss.
- [ ] Defender scans (Windows Security) and signing/reputation addressed before public release.
- [ ] Uninstall leaves user diary data intact.
- [ ] Test window scaling at 100%, 125%, 150%, 1920x1080 and laptop 1366x768.
