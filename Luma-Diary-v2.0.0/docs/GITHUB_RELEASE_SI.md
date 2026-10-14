# GitHub එකෙන් Luma Diary v2.0.0 Setup.exe හදන හැටි 💙

මෙම ZIP එක **source code** එකක්. `.exe` installer එක GitHub Actions හි Windows runner එකෙන් build වෙනවා.

1. https://github.com/new → `luma-diary` නමින් repository එකක් සාදන්න. Public තෝරන්න.
2. Download කරපු project ZIP එක `Extract All` කරලා ඇතුළත files/folders ගන්න. `.github/workflows/windows.yml` යන hidden folder එකත් upload කරන්න (හොඳම ක්‍රමය GitHub Desktop භාවිතය).
3. Repository එකේ `Actions` tab එකේ **Build Windows Installer** workflow එක select කරන්න.
4. **Run workflow** → `main` → **Run workflow** click කරන්න.
5. Job එක සාර්ථකව අවසන් වුණාට පස්සේ එම run එකේ **Artifacts** යටතේ `Luma-Diary-Windows-Setup` download කරන්න.
6. එම artifact ZIP එක extract කළාම `Luma-Diary-Glass-Setup-2.0.0.exe` ලැබෙන්න ඕනේ.
7. Windows 11 machine එකක installer, shortcuts, uninstall, locked vault, create/edit/delete, backup, reminders හා themes test කරන්න.
8. Test pass නම් `Releases` → `Draft a new release` → tag `v2.0.0` → title `Luma Diary v2.0.0 (Preview)` → Setup EXE upload → **pre-release** → Publish.

**Google Drive:** Repository `Settings → Secrets and variables → Actions → Variables` තුළ `GOOGLE_CLIENT_ID` යන variable එකට **Google Cloud Desktop OAuth Client ID** දාන්න. එය නොමැති build එකේ Google login හොඳින් වැඩ නොකරන්න පුළුවන්.

**Microsoft Defender/SmartScreen:** මෙය unsigned app එකක් නම් warning/block එකක් ලැබෙන්න පුළුවන්. Defender off කරන්න එපා. Official code signing/Microsoft Store publish කිරීමට යොමුවෙන්න. නව installer එක PowerShell installer script එකක් නොව NSIS wizard එකක්.

**Upgrade:** v1.1 native encrypted vault auto-overwrite කරන්නේ නැහැ. v1.2 setup screen එකේ **Import from Native v1.1** button එක old vault එක හඳුනාගත්තොත් පෙන්වනවා. Import එකට පැරණි passphrase අවශ්‍යයි. පරණ app delete කරන්න කලින් encrypted manual backup එකක් USB drive එකට තියාගන්න.

**Update version:** `package.json` තුළ `version` වෙනස් කරලා (උදා `1.2.1`) source update push කරන්න. `v1.2.1` tag/release එකට අලුත් installer build කරන්න. මුල් `appId` වෙනස් කරන්න එපා: upgrade paths අවුල් වෙන්න පුළුවන්.
