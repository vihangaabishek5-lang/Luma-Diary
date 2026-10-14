# ☁️ Luma Diary — Google Drive Setup (සිංහල)

## 1. මේක ඇයි කරන්න ඕනි?

Google Drive API එකට app එක connect කරගන්න නම් publisher විසින් Google Cloud OAuth **Desktop Client ID** එකක් හදාගන්න ඕනි. මේ Client ID එක code එකට embed කරන්න පුළුවන්; එය public identifier එකක් මිස password/secret එකක් නොවේ. User sign-in එක Google browser tab එකකින් වෙනවා. Luma userගේ Google password එක ලබාගන්නේ නැහැ.

## 2. Google Cloud project එක හදන්න

1. [console.cloud.google.com](https://console.cloud.google.com/) open කරන්න.
2. Project picker → **New Project** → `Luma Diary` වැනි නමක් දෙන්න.
3. **APIs & Services → Library → Google Drive API → Enable**.
4. **Google Auth Platform** හෝ **OAuth consent screen** වෙත යන්න. App name, developer email සහ audience details ලබා දෙන්න.
5. User Type/Audience **External** තෝරන්න (personal Gmail accounts වැනි public users සඳහා).
6. Data access/scopes වෙත `https://www.googleapis.com/auth/drive.appdata` scope එක add කරන්න. මෙම scope එක Google විසින් non-sensitive ලෙස සලකනවා; නමුත් publication/verification requirements වෙනස් විය හැකියි.
7. **Clients → Create Client → Desktop app** තෝරලා Client ID එක ලබා ගන්න.
8. OAuth project එක **Testing** mode එකේ නම් test users පමණක් sign-in කළ හැකියි. Public release සඳහා publishing status සහ applicable Google requirements සකස් කරන්න.

## 3. GitHub Actions EXE එකට Client ID එක ඇතුළත් කරන ආකාරය

1. GitHub repository → **Settings**.
2. **Secrets and variables → Actions → Variables**.
3. **New repository variable** → Name: `GOOGLE_CLIENT_ID`.
4. Value: Google Cloud Desktop OAuth Client ID (`...apps.googleusercontent.com`).
5. **Actions → Build Windows Installer → Run workflow**.
6. Installer එක ඇතුළේ Client ID auto-configure වෙනවා. Users Settings එකේ **Connect Google Drive** click කළාම browser එක open වෙනවා.

Developer කෙනෙකුට local source run කරන විට `src/app-config.json` හි `googleClientId` fill කරන්නත් පුළුවන්. ඒ file එකේ **client secret, access token, refresh token** එකතු කරන්න එපා.

## 4. User sign-in / backup ක්‍රමය

1. Luma Diary open කරලා passphrase එකෙන් unlock කරන්න.
2. **Settings → Connect Google Drive** තෝරන්න.
3. Google browser tab එකේ sign-in කර consent දෙන්න.
4. **Backup & Sync → Sync now**. මේක encryption කළ snapshot එකක් Google Drive app-data storage එකේ upload කරයි.
5. **Automatic Drive sync** on නම්, app එක open සහ unlocked තියෙන විට වෙනස්කම් auto-sync කරයි.

## 5. දෙවෙනි computer එකක් හෝ data restore කරන විදිහ

1. දෙවෙනි PC එකේ Luma Diary install කරන්න.
2. Local passphrase එකක් හදා, Google Drive connect කරන්න (same Google account සහ same OAuth application Client ID).
3. **Backup & Sync → Restore cloud backup**.
4. පරණ encrypted diary එකේ **passphrase එක** type කරන්න.
5. මේක current local entries replace කරනවා; පරණ local vault එකේ safety copy එකක් app-data folder එකට save වෙනවා.
6. Restore පසු දෙවෙනි PC එකෙන් Sync කරගන්න පුළුවන්. දෙපැත්තේ එකම encryption salt/key පවතිනවා.

**Warning:** Cloud restore එක local diary එක replace කරනවා. Merge අවශ්‍ය නම් Restore කිරීමට පෙර local encrypted file එක export කරලා වෙනම තියාගන්න. Simultaneous cross-device editing වල conflict-free support guarantee නැහැ. Password අමතක වුණොත් restore කරන්න බැහැ.

## 6. Google Drive folder එක කොහෙද?

Google Drive **appDataFolder** කියන්නේ hidden app-specific storage එකක්. Ordinary **My Drive** interface එකේ backup file එක පේන්නේ නැහැ. Google Drive app settings වලින් app data delete වීම හෝ app authorization revoke වීමෙන් backup වෙත access අහිමි වෙන්න පුළුවන්. ඒ නිසා local encrypted backup එකක් තවත් තැනක තියාගන්න.

Official documentation:

- [Google Drive app-data folder](https://developers.google.com/workspace/drive/api/guides/appdata)
- [OAuth 2.0 Desktop App flow](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Google Cloud Console](https://console.cloud.google.com/)
