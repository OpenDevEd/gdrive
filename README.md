# bgdrive
A simple nodejs script for performing basic actions in google drive.

```
node bgdrive help
```

# installation

```
npm install googleapis@39 --save
npm install commander
```

Note: This requires setting up of
```
~/.config/Bgdrive/credentials.json
```
Please read the Google Drive API v3 docs to figure out how to do that.

The script has links to the API docs in it.
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
