#!/usr/bin/env node
const path = require('path');

const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
const confdir = require('os').homedir() + "/.config/Bgdrive/"

const TOKEN_PATH = confdir + 'token.json';

const { Command } = require('commander');
const program = new Command();
program.version('0.0.1');

program
  .option('-d, --debug', 'debug')

program
  .command('download <source...>')
  .option('-f, --format [format]', 'specify the format: pdf,txt,html,docx,odt,xlsx,ods,csv,tsv,pptx,odp (separate multiple formats with comma)', 'pdf')
  .description('Download gdrive file(s) in the given format(s).')
  .action((source, options) => {
    source = cleanUp(source)
    runFunction(exportFile, { sources: source, options: options });
  });

/*
New files: Might be easier to just stick with the browser-based ways of doing this?

program
  .command('new')
*/

program
  .command('move <source...>')
  .option('-t, --target [id]', 'specify the target folder')
  .option('-s, --shortcut', 'Create a shortcut in the original folder of the file')
  .description('Move gdrive file(s) to the folder with id')
  .action((source, options) => {
    source = cleanUp(source)
    options.target = cleanUp(options.target)
    runFunction(moveFiles, { sources: source, options: options });
  });


program
  .command('shortcut <source...>')
  .option('-t, --target [id]', 'specify the target folder')
  .description('Create shortcuts for gdrive file(s) in the folder with id')
  .action((source, options) => {
    source = cleanUp(source)
    options.target = cleanUp(options.target)
    runFunction(createShortcuts, { sources: source, options: options });
  });

program
  .command('wormhole <source...>')
  .option('-w, --oldnew', 'prefix [old] and [new]')
  .option('-m, --migrate', 'prefix [old_Shared_Folder] and [new_Shared_Drive]')
  .description('Create shortcuts for gdrive folders in the folders')
  .action((source, options) => {
    source = cleanUp(source)
    runFunction(createWormhole, { sources: source, options: options });
  });

program
  .command('copy <source...>')
  .option('-t, --target [id]', 'specify the target folder')
  .option('-p, --prefix [string]', 'prefix the name of the copied file with "string"')
  .option('-n, --name [string]', 'Name the file "string" (only makes sense for one file to be copied)')
  .description('Copy the gdrive file(s) and move to folder with id')
  .action((source, options) => {
    source = cleanUp(source)
    options.target = cleanUp(options.target)
    runFunction(copyFiles, { sources: source, options: options });
  });


  program
  .command('newfolder <name...>')
  .option('-t, --target [id]', 'specify the target folder')
  .description('Create folders on gdrive.')
  .action((name, options) => {
    options.target = cleanUp(options.target)
    runFunction(createFolders, { names: name, options: options });
  });


  program
  .command('upload <path...>')
  .option('-t, --target [id]', 'specify the target folder')
  .description('Upload Files on gdrive.')
  .action((path, options) => {
    options.target = cleanUp(options.target)
    runFunction(uploadFiles, { names: path, options: options });
  });



program.parse(process.argv);
const options = program.opts();
if (options.debug) console.log(options);


function cleanUp(value) {
  if(value===undefined)
  {
    // console.log("no need to clean ")
    return;

  }
  if (Array.isArray(value)) {
    value = value.map(x => cleanUpOne(x));
  } else {
    value = cleanUpOne(value);
  };
  return value;
}

function cleanUpOne(value) {
  return value.replace(/\?.*$/i, "").replace(/\/edit.*$/i, "").replace(/^.*\//, "");
}

function runFunction(callback, callbackparameters) {
  // Load client secrets from a local file.
  fs.readFile(confdir + 'credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Docs API.
    authorize(JSON.parse(content), callback, callbackparameters);
  });
};

/*
function main(auth) {
  fileId = "..."
  exportFile(auth, fileId, type);
}
*/

async function copyFiles(auth, parameters) {
  files = parameters.sources
  folderId = parameters.options.target
  prefix = parameters.options.prefix
  name = parameters.options.name
  files.forEach(async (fileId) => {
    copyFile(auth, fileId, folderId, prefix)
  })
}

async function copyFile(auth, fileId, folderId, prefix, name) {
  var drive = google.drive({ version: 'v3', auth: auth });
  console.log('File Id: ' + fileId);
  const title = await getName(auth, fileId);
  console.log('Title: ' + title);
  const options = {
    fields: "id,name,parents", // properties sent back to you from the API
    supportsAllDrives: true
  };
  const metadata = {
    name: name,
    // Team Drives files & folders can have only 1 parent
    parents: [{ id: folderId }],
    // other possible fields you can supply: 
    // https://developers.google.com/drive/api/v2/reference/files/copy#request-body
  };
  const result = await drive.files.copy({
    'fileId': fileId,
    'fields': 'id,name,mimeType,parents',
    'name': name,
    parents: [folderId]
  })
  // console.log("TEMPORARY=" + JSON.stringify(result, null, 2))
  data = result.data
  moveOneFile(auth, data.id, folderId);
  renameFile(auth, data.id, name);



  //  moveOneFile(auth, shortcut.id, folderId);

}


async function exportFile(auth, parameters) {
  // console.log("TEMPORARY="+JSON.stringify(   parameters         ,null,2))   
  var drive = google.drive({ version: 'v3', auth: auth });
  fileIds = parameters?.sources
  types = parameters?.options.format.split(",");
  fileIds.forEach(async (fileId) => {
    const {data} = await drive.files.get({
      fileId,
      fields: 'name',
    });
    const name = data.name;
    const response = await drive.files.get({
  fileId,
  alt: 'media',
}, { responseType: 'stream' });

// Create a write stream to save the file content
const dest = fs.createWriteStream(name);

// Pipe the file content to the write stream
response.data.pipe(dest);

// Wait for the download to complete
await new Promise((resolve, reject) => {
  dest.on('finish', resolve);
  dest.on('error', reject);
});

console.log(`File "${name}" downloaded successfully! `);
  });
};

async function createWormhole(auth, parameters) {
  files = parameters.sources
  //console.log("TEMPORARY="+JSON.stringify(   parameters   ,null,2))
  //process.exit(1)
  var p1 = "";
  var p2 = "";
  if (parameters.options.oldnew) {
    p1 = "[OBSOLETE_FOLDER] "
    p2 = "[NEW_FOLDER] "
  }
  if (parameters.options.migrate) {
    p1 = "[OBSOLETE_SHARED_FOLDER] "
    p2 = "[NEW_FOLDER_IN_SHARED_DRIVE] "
  }
  createShortcut(auth, files[0], files[1], p1)
  createShortcut(auth, files[1], files[0], p2)
}

async function createShortcuts(auth, parameters) {
  files = parameters.sources
  folderId = parameters.options.target
  files.forEach(async (fileId) => {
    createShortcut(auth, fileId, folderId, "")
  })
}

// https://developers.google.com/drive/api/v3/reference/files/create
// https://developers.google.com/drive/api/v3/shortcuts
async function createShortcut(auth, fileId, folderId, prefix) {
  var drive = google.drive({ version: 'v3', auth: auth });
  const title = await getName(auth, fileId);
  if (!prefix) {
    prefix = ""
  }
  // console.log('File Id: ' + fileId);
  console.log('Title: ' + title);
  shortcutMetadata = {
    'name': prefix + title + " [shortcut]",
    'mimeType': 'application/vnd.google-apps.shortcut',
    'shortcutDetails': {
      'targetId': fileId
    }
  };
  drive.files.create({
    'resource': shortcutMetadata,
    'fields': 'id,name,mimeType,shortcutDetails,parents',
    // parents:  [folderId] , // <-- doesn't work...
  }, function (err, resp) {
    if (err) {
      // Handle error
      console.error(err);
    } else {
      shortcut = resp.data
      // console.log("TEMPORARY="+JSON.stringify(  shortcut          ,null,2))
      /*
     console.log('Shortcut Id: ' + shortcut.id +
                 ', Name: ' + shortcut.name +
                 ', target Id: ' + shortcut.shortcutDetails.targetId +
                 ', target MIME type: ' + shortcut.shortcutDetails.targetMimeType);
      */
      moveOneFile(auth, shortcut.id, folderId);
//      renameFile(auth, shortcut.id,  title + " [shortcut]");
    }

  });
}

async function moveFiles(auth, parameters) {
  // runFunction(moveFiles, { sources: source, options: options} );
  files = parameters.sources
  folderId = parameters.options.target
  const makeShortCut = parameters.options.shortcut
  files.forEach(async (fileId) => {
    moveOneFile(auth, fileId, folderId, makeShortCut)
  })
}

async function moveOneFile(auth, fileId, folderId, makeShortcut) {
  // https://developers.google.com/drive/api/v3/reference/files/get
  // Retrieve the existing parents to remove
  var drive = google.drive({ version: 'v3', auth: auth });
  drive.files.get({
    fileId: fileId,
    fields: 'parents',
    supportsAllDrives: true
  }, function (err, response) {
    if (err) {
      // Handle error
      console.error(err);
      console.log("ERROR ACCESSING^^^");
    } else {
      file = response.data
      // console.log("TEMPORARY="+JSON.stringify(   file         ,null,2))       
      // Move the file to the new folder
      var previousParents = file.parents.join(',');
      if (makeShortcut) {
        // console.log("TEMPORARY="+JSON.stringify(   file.parents         ,null,2))	 
        createShortcut(auth, fileId, file.parents[0]);
      }
      drive.files.update({
        fileId: fileId,
        addParents: folderId,
        removeParents: previousParents,
        fields: 'id, parents',
        supportsAllDrives: true
      }, function (err, resp) {
        if (err) {
          console.log("ERROR: " + JSON.stringify(err, null, 2))
          console.log("ERROR MOVING^^^");
        } else {
          //console.log("Success: "+JSON.stringify(    resp        ,null,2))
          console.log("Moved successfully.");
        }
      });
    }
  });
}

async function createFolders(auth, parameters) {
  if(!parameters) process.exit(1)
  names = parameters.names
  folderId = parameters.options.target
  const makeShortCut = parameters.options.shortcut
  names.forEach(async (name) => {
    createFolder(auth, name, folderId)
  })
}

async function uploadFiles(auth, params) {
  const folderId = params.options.target;
  for (const file of params.names) {
    const id = await uploadFile(auth, file,folderId);
  }
}


async function uploadFile(auth,file, folderId) {
  const fileName = path.basename(file);
  const isDirectory = fs.statSync(file).isDirectory();
  if (isDirectory) {
    console.log(`Skipping directory: ${fileName}`);
    return;
  }

  const drive = google.drive({ version: 'v3', auth });

  const requestBody = {
    name: fileName,
    parents: [folderId],
    fields: 'id',
  };
  const media = {
    body: fs.createReadStream(file),
  };

  try {
    const uploadedFile = await drive.files.create({
      requestBody,
      media,
    });

    console.log('File Id:', uploadedFile.data.id);
    return uploadedFile.data.id;
  } catch (err) {
    // TODO: Handle error
    console.log(err);
  }
}


async function createFolder(auth, name, folderId) {
  var drive = google.drive({ version: 'v3', auth: auth });
  var fileMetadata = {
    'name': name,
    'mimeType': 'application/vnd.google-apps.folder',
    'parents': [folderId],
    supportsAllDrives: true
  };
  drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  }, function (err, response) {
    if (err) {
      // Handle error
      console.error(err);
      return null
    }
    // console.log('Folder Id: ', JSON.stringify(response  ,null,2) );
    console.log('Succes, Folder Id: ', JSON.stringify(response.data.id, null, 2));
    fileId = response.data.id
    return fileId
  });  
}

async function getName(auth, id) {
  var drive = google.drive({ version: 'v3', auth: auth });
  try {
    //console.log("in");
    const permissions = await drive.permissions.list({
      fileId: id,
      supportsAllDrives: true

    });
    
    // The `permissions` object will contain an array of all the permissions for the file
    console.log(permissions.data);
    const res = await drive.files.get({
      fileId: id,
      supportsAllDrives: true
    });
    // console.log("TEMPORARY="+JSON.stringify(    res        ,null,2))
    return res.data.name
  } catch (err) {
    console.log("ERROR=" + JSON.stringify(err, null, 2))
    return "Title_not_avaiable";    
  };
}


/**
 * Prints the title of a sample doc:
 * https://docs.google.com/document/d/195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth 2.0 client.
 */
async function printDocTitle(auth, id) {
  const docs = google.docs({ version: 'v1', auth });
  try {
    const res = await docs.documents.get({
      documentId: id
    })
    //  if (err) {
    //    return console.log('The API returned an error: ' + err);
    //  }
    // console.log("TEMPORARY="+JSON.stringify(    res        ,null,2))    
    console.log(`The title of the document is: ${res.data.title}`);
    return res.data.title;
  } catch (e) {
    console.log("TEMPORARY=" + JSON.stringify(e, null, 2))
    return "Title_not_avaiable";
  }
}

async function renameFile(auth, fileId, name) {
  // https://developers.google.com/drive/api/v3/reference/files/get
  // Retrieve the existing parents to remove
  var drive = google.drive({ version: 'v3', auth: auth });
  const resource = {'name': name};
  drive.files.update({
    fileId: fileId,
    resource: resource,
    supportsAllDrives: true
  }, function (err, resp) {
    if (err) {
      console.log("ERROR: " + JSON.stringify(err, null, 2))
      console.log("ERROR RENAMING^^^");
    } else {
      console.log("Success: "+JSON.stringify(    resp.data        ,null,2))
      console.log("Renamed successfully.");
    }
  });
}



/**
 * @license
 * Copyright Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
v * limitations under the License.
 */
// [START docs_quickstart]
// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback, parameters) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
    client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback, parameters);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, parameters);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback, parameters) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
        callback(oAuth2Client, parameters);
      });
    });
  });
}

// [END docs_quickstart]
/*
module.exports = {
  SCOPES,
  printDocTitle,
};
*/
