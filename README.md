# Bgdrive
A simple nodejs script for performing basic actions in google drive.

```
node bgdrive help
```

# Installation

```
npm install googleapis@39 --save
npm install commander
```

Note: This requires setting up of
```
~/.config/Bgdrive/credentials.json
```


## Getting Google Credentials for Google Drive API
  
The script has links to the API docs in it.

Follow these steps to get your Google Credentials for Google Drive API:

#### Step 1: Go to Google Cloud Console

First, navigate to the [Google Cloud Console](https://console.cloud.google.com/).

#### Step 2: Create a New Project

![Create New Project](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*Li8oIH9iWyWmq4GhFfBcfA.png)

Click on the "Select a project" dropdown, then click on "NEW PROJECT". Give your project a name and click "CREATE".

#### Step 3: Enable Google Drive API

![Enable Google Drive API](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*44xNkyL3LPsSwMr4G9IC-A.png)

In the Dashboard, click on "ENABLE APIS AND SERVICES". Search for "Google Drive API" and click on it. Then click "ENABLE".

#### Step 4: Create Credentials

![Create Credentials](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*zgiH8WBmrd68UOjVg3I1uQ.png)

Go back to the Dashboard and click on "Credentials" in the left-hand menu. Click on "CREATE CREDENTIALS" and select "OAuth client ID".

#### Step 5: Configure OAuth Consent Screen

![Configure OAuth Consent Screen](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*u4PWb9EyMYhbUwby2Jk7Ug.png)

You'll be asked to configure the OAuth consent screen. Fill in the necessary details and click "SAVE".

#### Step 6: Create OAuth Client ID

![Create OAuth Client ID](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*pcjpbnNcv_UjBdBOzskkJQ.png)

Select "Web application" as the Application type. Give it a name and add your redirect URIs, then click "CREATE".

#### Step 7: Download Credentials

![Download Credentials](https://miro.medium.com/v2/resize:fit:1400/format:webp/1*V4EeM45vm63htFxb67beMQ.png)

You'll see a screen with your client ID and client secret. Click on the download icon to download your credentials in a JSON file.

And that's it! You now have your Google Credentials for Google Drive API.


# Options

- `-V, --version`: Displays the version number of BGDrive.
- `-d, --debug`: Enables debug mode.
- `-h, --help`: Displays help for the command.

# Commands

- `download <source...>`: Downloads gdrive file(s) in the given format(s).
- `move [options] <source...>`: Moves gdrive file(s) to the folder with the specified ID.
- `shortcut [options] <source...>`: Creates shortcuts for gdrive file(s) in the folder with the specified ID.
- `wormhole [options] <source...>`: Creates shortcuts for gdrive folders in the specified folders.
- `copy [options] <source...>`: Copies the gdrive file(s) and moves them to the folder with the specified ID.
- `newfolder [options] <name...>`: Creates folders on gdrive.
- `upload [options] <path...>`: Uploads files to gdrive.
- `get [options]`: Retrieves files from Google Drive.
- `help [command]`: Displays help for the specified command.

# See also

https://github.com/odeke-em/drive
