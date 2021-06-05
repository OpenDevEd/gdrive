#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');
const confdir = require('os').homedir() +  "/.config/Bgdrive/"

const TOKEN_PATH = confdir + 'token.json';

const { Command } = require('commander');
const program = new Command();
program.version('0.0.1');

program
  .option('-d, --debug', 'debug')

program
  .command('download <source...>')
  .option('-f, --format [format]', 'specify the format: pdf,txt,html,docx,odt,xlsx,ods,csv,tsv,pptx,odp (separate multiple formats with comma)','pdf')
  .description('Download gdrive file(s) in the given format(s).')
  .action((source, options) => {
    source = cleanUp(source)
    runFunction(exportFile, { sources: source, options: options} );
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
    runFunction(moveFiles, { sources: source, options: options} );
  });


program
  .command('shortcut <source...>')
  .option('-t, --target [id]', 'specify the target folder')
  .description('Create shortcuts for gdrive file(s) in the folder with id')
  .action((source, options) => {
    source = cleanUp(source)
    options.target = cleanUp(options.target)
    runFunction(createShortcuts, { sources: source, options: options} );
  });


program.parse(process.argv);
const options = program.opts();
if (options.debug) console.log(options);


function cleanUp(value) {
  if (Array.isArray(value)) {
    value = value.map( x => cleanUpOne(x) );
  } else {
    value = cleanUpOne(value);
  };
  console.log("cleanUp="+JSON.stringify(  value          ,null,2))  
  return value;
}

function cleanUpOne(value) {
  return value.replace(/\/edit.*$/i,"").replace(/^.*\//,"");
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

async function exportFile(auth, parameters) {
  // console.log("TEMPORARY="+JSON.stringify(   parameters         ,null,2))   
  var drive = google.drive({version: 'v3', auth: auth});
  fileIds = parameters.sources
  types = parameters.options.format.split(",");
  fileIds.forEach( async (fileId) => {
    types.forEach( async (type) => {
      const title = await printDocTitle(auth,fileId);
      console.log(title);
      var filename = title + '.pdf';
      var mimetype = 'application/pdf'; 
      // https://developers.google.com/drive/api/v3/ref-export-formats
      switch(type) {
      case 'pdf':
	filename = title + '.pdf';
	mimetype = 'application/pdf';
	break;
      case 'html':
	filename = title + '.html';
	mimetype = 'text/html';
	break;
      case 'txt':
	filename = title + '.txt';
	mimetype = 'text/plain';
	break;
      case 'docx':
      case 'doc':
	filename = title + '.docx';
	mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
	break;
      case 'odt':
	filename = title + '.odt';
	mimetype = "application/vnd.oasis.opendocument.text";
	break;
      case 'xls':
      case 'xlsx':
	filename = title + '.xlsx';
	mimetype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
	break;
      case 'ods':
	filename = title + '.ods';
	mimetype = "application/x-vnd.oasis.opendocument.spreadsheet";
	break;
      case 'csv':
	filename = title + '.csv';
	mimetype = "text/csv";
	break;
      case 'tsv':
	filename = title + '.tsv';
	mimetype = "text/tab-separated-values";
	break;
      case 'ppt':
      case 'pptx':
	filename = title + '.pptx';
	mimetype = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
	break;
      case 'odp':
	filename = title + '.odp';
	mimetype = "application/vnd.oasis.opendocument.presentation";
	break;
/*      case '':
	filename = title + '.?';
	mimetype = "";
	break; */
      default:
	console.log(`Did not understand type=${type}`);
	return null;
      }
      
      var dest = fs.createWriteStream(filename);
      
      const { data } = await drive.files.export(
	{
	  fileId: fileId,
	  mimeType: mimetype,
	},
	{
	  responseType: 'stream',
	}
      );
      
      data
	.on('end', function () {
	  console.log('Done');
	})
	.on('error', function (err) {
	  console.log('Error during download', err);
	})
	.pipe(dest);
    });
  });
};

async function createShortcuts(auth, parameters) {
  files = parameters.sources
  folderId = parameters.options.target
  files.forEach(async (fileId) => {
    createShortcut(auth, fileId, folderId)
  })
}

// https://developers.google.com/drive/api/v3/reference/files/create
// https://developers.google.com/drive/api/v3/shortcuts
async function createShortcut(auth, fileId, folderId) {
  var drive = google.drive({version: 'v3', auth: auth});
  console.log('File Id: ' + fileId);
  const title = await printDocTitle(auth,fileId);
  console.log('Title: ' + title);
  shortcutMetadata = {
    'name': title + " [shortcut]",
    'mimeType': 'application/vnd.google-apps.shortcut',
    'shortcutDetails': {
      'targetId': fileId
    }
  };
  drive.files.create({
    'resource': shortcutMetadata,
    'fields': 'id,name,mimeType,shortcutDetails,parents',
     // parents:  [folderId] , // <-- doesn't work...
  }, function(err, resp) {
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
    }

  });
}

async function moveFiles(auth, parameters ) {
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
  var drive = google.drive({version: 'v3', auth: auth});  
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
	  console.log("ERROR: "+JSON.stringify(    err        ,null,2))	   
	  console.log("ERROR MOVING^^^");
	} else {
	  //console.log("Success: "+JSON.stringify(    resp        ,null,2))
	  console.log("Moved successfully.");
	}
      });
    }
  });

}
  

function createFolder(auth) {
  var drive = google.drive({version: 'v3', auth: auth});
  var fileMetadata = {
    'name': 'Invoices',
    'mimeType': 'application/vnd.google-apps.folder'
  };
  drive.files.create({
    resource: fileMetadata,
    fields: 'id'
  }, function (err, file) {
    if (err) {
      // Handle error
      console.error(err);
    } else {
      //      console.log('Folder Id: ', JSON.stringify(file            ,null,2) );
      console.log('Folder Id: ', JSON.stringify(file.data.id            ,null,2) );
    }
  });

}

/**
 * Prints the title of a sample doc:
 * https://docs.google.com/document/d/195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth 2.0 client.
 */
async function printDocTitle(auth, id) {
  const docs = google.docs({version: 'v1', auth});
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
    console.log("TEMPORARY="+JSON.stringify(  e          ,null,2))
    return "Title_not_avaiable";
  }
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
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
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
function getNewToken(oAuth2Client, callback) {
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
      });
      callback(oAuth2Client);
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
