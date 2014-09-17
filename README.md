# SiloMon

Monitor your [Microsoft Orleans](http://aka.ms/orleans) Silos.

SiloMon is hosted here [http://www.silomon.net](http://www.silomon.net).

Or host the application yourself with Azure Websites.

The following environment variables must be set:

* `CRYPTO_KEY` - a key used to encrypt the storage account keys. This can be any random text.
* `STORAGE_NAME` - the name of your storage account to store usernames and passwords.
* `STORAGE_KEY` - the key to your storage account.
* `SESSION_SECRET` - the secret for encrypting the session tokens.
* `WINDOWS_CLIENT_ID` - your windows live client ID.
* `WINDOWS_CLIENT_SECRET` - your windows live secret.
* `WINDOWS_CALLBACK` - the callback url for Windows Live (i.e. `http://www.silomon.net/auth/windowslive/callback`)
* `GOOGLE_CLIENT_ID` - your Google client ID.
* `GOOGLE_CLIENT_SECRET` - your Google secret.
* `GOOGLE_CALLBACK` - the callback url for Google (i.e. `http://www.silomon.net/auth/google/callback`)
