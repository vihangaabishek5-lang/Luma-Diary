# 🖥️ Luma Diary — Windows `.exe` සහ GitHub Releases Guide

## A. Windows 11 PC එකේ තනිවම `.exe` එක හදන හැටි

1. [Node.js LTS](https://nodejs.org/) install කරන්න (npm එකත් සමග ලැබේ).
2. Project ZIP එක extract කරන්න.
3. Folder එක ඇතුළේ `build-windows-exe.bat` **double click** කරන්න.
4. Internet connection එකක් තිබිය යුතුයි. npm වලින් Electron සහ builder download වෙනවා.
5. Build එක success නම් `dist/Luma-Diary-Glass-Setup-2.0.0.exe` ලැබේ.
6. Installer එක run කරලා test කරන්න.

Alternative: folder එක ඇතුළේ terminal open කරලා:

```powershell
npm install
npm test
npm run build:win
```

## B. PC එකේ compiler setup නැතුව GitHub cloud එකෙන් `.exe` හදන හැටි

1. [GitHub](https://github.com/) → **New repository** → `luma-diary` → Public → Create.
2. [GitHub Desktop](https://desktop.github.com/) install කර source folder එක repository එකට commit+push කරන්න, නැත්නම් README හි `git` commands follow කරන්න.
3. `main` branch එක push වූ විට `.github/workflows/windows.yml` මඟින් Windows runner එකේ build වීම ආරම්භ වෙයි.
4. Repo → **Actions → Build Windows Installer → latest successful run**.
5. **Artifacts → Luma-Diary-Windows-Setup** download කරන්න; ZIP extract කරන්න.
6. Extract කළ `.exe` file එක Windows 11 එකේ install කරලා test කරන්න.

Workflow එක `.exe` සෑදීමට GitHub hosted **Windows runner** භාවිතා කරන නිසා Linux/macOS PC එකක Windows installer build කිරීමට අමතර tooling අවශ්‍ය නැහැ.

## C. Public users සඳහා GitHub Release එක publish කිරීම

Version `2.0.0` සඳහා:

```bash
git tag v2.0.0
git push origin v2.0.0
```

GitHub Actions tag push එක දැක Windows EXE build කර **Release v2.0.0** එකට attach කරයි. Repo එකේ **Releases** පිටුවේ file එක ඕනෑම visitor කෙනෙකුට download කරන්න පුළුවන් (repository public නම්).

GitHub Actions `contents: write` permission එක release publishing සඳහා workflow එකේ දීලා තියෙනවා. Organization policy අනුව වෙනම approval අවශ්‍ය විය හැකියි.

## D. අනාගත versions update කිරීම

Version උදාහරණය `1.1.0`:

- Code edit කරන්න.
- `package.json` version `1.1.0` කරන්න.
- `CHANGELOG.md` update කරන්න.
- `npm test` run කරලා changes commit + push කරන්න.
- `git tag v1.1.0` සහ `git push origin v1.1.0` කරන්න.
- GitHub release එකට new `.exe` attach වෙනවා.

**App → Settings → Check for updates** GitHub latest release එක check කරනවා. Current design එකේ installer automatic download/install වෙන්නේ නැහැ. එවැනි updates අවශ්‍ය නම් ඉදිරියේදී code-signing සහ secure updater එකක් separate release එකක implement කරන්න ඕනි.

## E. Public app distribution ගැන වැදගත්ම දේවල්

- Google Drive sign-in සියල්ලන්ට වැඩ කිරීමට **publisher-owned OAuth Desktop Client ID** එක build එකට configure කරන්න.
- Google OAuth consent screen **production** state එකට සූදානම් කරන්න; app verification/branding requirements අදාළ විය හැකියි.
- **Unsigned installer** එකක් Windows SmartScreen warning එකක් trigger කරන්න පුළුවන්. Trustworthy mass distribution සඳහා Windows **code signing certificate** එකක් ගැන සලකා බලන්න.
- GitHub public repo එකට passwords, tokens, secrets, private diaries හෝ backup files push කරන්න එපා.
- App updates දීමේදී app version වගේම Electron dependencies වල security updates ද නිතර update කරන්න.
- Release කිරීමට පෙර **actual Windows 11 computer** එකේ installer, unlock, reminders, Google OAuth, cloud backup/restore සහ uninstall/reinstall test කරන්න.

## F. User data කොහෙද save වෙන්නේ?

Windows user-profile යටතේ Electron app's **userData** location එකේ encrypted `vault.json` file එකක් ගබඩා වෙනවා (සාමාන්‍යයෙන් `%APPDATA%\luma-diary\vault.json`; Electron app naming/settings අනුව folder name වෙනස් විය හැකියි).

App එක re-install කරන විට සාමාන්‍යයෙන් userData location පවතිනවා, නමුත් ඒ මත පමණක් විශ්වාස නොකර encrypted local/Drive backup කරන්න. Restore කලොත් old vault එකේ safety copy එකත් එම user-data folder එකේම තබනවා.
