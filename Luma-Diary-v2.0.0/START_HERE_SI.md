# Luma Diary v2.0 · ආරම්භ කරන්න

මේ ZIP එක **source code** එකයි. Windows Setup.exe එක මේ runtime එකෙන් build කරලා නැහැ.

1. ZIP file එක extract කරන්න.
2. GitHub එකේ `luma-diary` නමින් public/private repository එකක් හදන්න.
3. Extract කළ folder එකේ **ඇතුළත** සියලු project files upload කරන්න. `.github` folder එකත් ඇතුළත් කරන්න.
4. GitHub හි Actions → Build Windows Installer → Run workflow තෝරන්න.
5. Build සාර්ථක නම් Artifacts → Luma-Diary-Windows-Setup download කරලා extract කරන්න. `.exe` එක ලැබේ.
6. Windows 11 x64 PC එකක install කරලා Home, Journal save/reopen, reminders, themes, encrypted backup import සහ cloud backup පරීක්ෂා කරන්න.

### මතක තියාගන්න

- Microsoft Defender off කරන්න එපා. Unsigned app එකකට SmartScreen warning එන්න පුළුවන්.
- පරණ diary එක uninstall/delete කරන්න කලින් encrypted backup එකක් ගන්න.
- Google Drive connect කරන්න publisher කෙනෙක් OAuth Desktop Client ID configure කරන්න ඕනේ.
- මුල් Welcome screen එකෙන් Get Started click කරලා ආරක්ෂිත passphrase එකක් සාදන්න. පසුව unlock කරන්න එය භාවිතා කරන්න.
- මේක තවම Windows end-to-end test නොකළ development preview එකක්.
