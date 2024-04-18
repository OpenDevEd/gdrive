#!/usr/bin/env node
const path = require("path");

const fs = require("fs");
const readline = require("readline");
const { google } = require("googleapis");
const confdir = require("os").homedir() + "/.config/Bgdrive/";

const TOKEN_PATH = confdir + "token.json";

const { Command } = require("commander");

const program = new Command();
program.version("0.0.1");

program.option("-d, --debug", "debug");

program
  .command("sheet <source...>")
  .option(
    "-r, --range [range]",
    "For a sheet, you can specify the range. Data will be returned as json.",
    ""
  )
  .option(
    "-s, --set [string]",
    "set the values to a json string",
    ""
  )
  .option(
    "-o, --setone [string]",
    "set one value",
    ""
  )
  .option(
    "-f, --file [string]",
    "set the values to a json string from a file",
    ""
  )
  .option(
    "-g, --getone",
    "get one value",
    ""
  )
  .description("Read and set values in a sheet.")
  .action((source, options) => {
    source = cleanUp(source);
    gid = getgid(source);
    runFunction(handleSheet, { sources: source, gid: gid, options: options });
  });


program
  .command("download <source...>")
  .option(
    "-f, --format [format]",
    "specify the format: pdf,txt,html,docx,odt,xlsx,ods,csv,tsv,pptx,odp (separate multiple formats with comma)",
    "-"
  )
  .option(
    "-r, --range [range]",
    "For a sheet, you can specify the range. Data will be returned as json.",
    ""
  )
  .description("Download gdrive file(s) in the given format(s). For sheets, if a gid is present, sheets.spreadsheets will be used.")
  .action((source, options) => {
    source = cleanUp(source);
    gid = getgid(source);
    runFunction(exportFile, { sources: source, gid: gid, options: options });
  });

/*
New files: Might be easier to just stick with the browser-based ways of doing this?
program
  .command('new')
*/

program
  .command("move <source...>")
  .option("-t, --target [id]", "specify the target folder")
  .option(
    "-s, --shortcut",
    "Create a shortcut in the original folder of the file"
  )
  .description("Move gdrive file(s) to the folder with id")
  .action((source, options) => {
    source = cleanUp(source);
    options.target = cleanUp(options.target);
    runFunction(moveFiles, { sources: source, options: options });
  });

program
  .command("shortcut <source...>")
  .option("-t, --target [id]", "specify the target folder")
  .description("Create shortcuts for gdrive file(s) in the folder with id")
  .action((source, options) => {
    source = cleanUp(source);
    options.target = cleanUp(options.target);
    runFunction(createShortcuts, { sources: source, options: options });
  });

program
  .command("wormhole <source...>")
  .option("-w, --oldnew", "prefix [old] and [new]")
  .option("-m, --migrate", "prefix [old_Shared_Folder] and [new_Shared_Drive]")
  .description("Create shortcuts for gdrive folders in the folders")
  .action((source, options) => {
    source, gid = cleanUp(source, true);
    runFunction(createWormhole, { sources: source, options: options });
  });

program
  .command("copy <source...>")
  .option("-t, --target [id]", "specify the target folder")
  .option(
    "-p, --prefix [string]",
    'prefix the name of the copied file with "string"'
  )
  .option(
    "-n, --name [string]",
    'Name the file "string" (only makes sense for one file to be copied)'
  )
  .description("Copy the gdrive file(s) and move to folder with id")
  .action((source, options) => {
    source = cleanUp(source);
    options.target = cleanUp(options.target);
    runFunction(copyFiles, { sources: source, options: options });
  });

program
  .command("newfolder <name...>")
  .option("-t, --target [id]", "specify the target folder")
  .description("Create folders on gdrive.")
  .action((name, options) => {
    options.target = cleanUp(options.target);
    runFunction(createFolders, { names: name, options: options });
  });

program
  .command("upload <path...>")
  .option("-t, --target [id]", "specify the target folder")
  .description("Upload Files on gdrive.")
  .action((path, options) => {
    options.target = cleanUp(options.target);
    runFunction(uploadFiles, { names: path, options: options });
  });

program
  .command("list")
  .option("-f, --folderOnly", "Retrieve only folders")
  .option("-i, --fileOnly", "Retrieve only files")
  .option(
    "-t, --format <format...>",
    "specify the format: pdf,txt,html,docx,odt,xlsx,ods,csv,tsv,pptx,odp (separate multiple formats with comma)",
  )
  .option("-n, --name [string]", "Specify a string to search for in file names")
  .option("-d, --driveid [string]", "Specify a drive id to search")
  .option("-s, --save [string]", "Save output as json")
  // .option("-p, --parent [string]", "Specify a parent folder id to search. This requires that you have generated a tree.json file.")
  .description("Retrieve files from Google Drive (drive.files.list). Note that it's not possible retrive sub-folders of a folder. See option 'tree'.")
  .action((options) => {
    options.parent = cleanUp(options.parent)
    options.driveid = cleanUp(options.driveid)
    console.log(options)
    runFunction(collectElements, { options: options });
  });

/*
program
.command("tree")
.option("-d, --drive [id]", "specify the drive")
.description("Retrieve tree of folders from Google Drive. This is slow. Output to tree.json")
.action((options) => {
  // options.parent = cleanUp(options.parent)
  runFunction(getTree, { options: options });
});
*/

program
  .command("name <id>")
  .option("-s, --set [string]", "Set the name.")
  .option("-p, --prefix [string]", "Prefix the name.", "")
  .option("-a, --append [string]", "Append to the name.", "")
  .description("Get or set or modify the name.")
  .action((id, options) => {
    id = cleanUp(id);
    runFunction(nameOperation, { id: id, options: options });
  });


program.parse(process.argv);
const options = program.opts();
if (options.debug) console.log(options);

function cleanUp(value) {
  if (value === undefined) {
    // console.log("no need to clean ")
    return;
  }
  if (Array.isArray(value)) {
    value = value.map((x) => cleanUpOne(x));
  } else {
    value = cleanUpOne(value);
  }
  return value;
}

function getgid(value) {
  if (value === undefined) {
    // console.log("no need to clean ")
    return;
  }
  if (Array.isArray(value)) {
    value = value.map((x) => getgidone(x));
  } else {
    value = getgidone(value);
  }
  return value;
}

function getgidone(value) {
  gid = value.replace(/\#gid/, "");
  return gid;
};

function cleanUpOne(value) {
  return value
    .replace(/\?.*$/i, "")
    .replace(/\/(edit|view).*$/i, "")
    .replace(/^.*\//, "");
}

function runFunction(callback, callbackparameters) {
  // Load client secrets from a local file.
  fs.readFile(confdir + "credentials.json", (err, content) => {
    if (err) return console.log("Error loading client secret file:", err);
    // Authorize a client with credentials, then call the Google Docs API.
    authorize(JSON.parse(content), callback, callbackparameters);
  });
}

/*
function main(auth) {
  fileId = "..."
  exportFile(auth, fileId, type);
}
*/

async function copyFiles(auth, parameters) {
  files = parameters.sources;
  folderId = parameters.options.target;
  prefix = parameters.options.prefix;
  name = parameters.options.name;
  files.forEach(async (fileId) => {
    copyFile(auth, fileId, folderId, prefix);
  });
}

async function copyFile(auth, fileId, folderId, prefix, name) {
  var drive = google.drive({ version: "v3", auth: auth });
  console.log("File Id: " + fileId);
  const title = await getName(auth, fileId);
  console.log("Title: " + title);
  const options = {
    fields: "id,name,parents", // properties sent back to you from the API
    supportsAllDrives: true,
  };
  const metadata = {
    name: name,
    // Team Drives files & folders can have only 1 parent
    parents: [{ id: folderId }],
    // other possible fields you can supply:
    // https://developers.google.com/drive/api/v2/reference/files/copy#request-body
  };
  const result = await drive.files.copy({
    fileId: fileId,
    fields: "id,name,mimeType,parents",
    name: name,
    parents: [folderId],
  });
  // console.log("TEMPORARY=" + JSON.stringify(result, null, 2))
  data = result.data;
  moveOneFile(auth, data.id, folderId);
  renameFile(auth, data.id, name);

  //  moveOneFile(auth, shortcut.id, folderId);
}

async function driveFilesExport(auth, filename, param) {
  var drive = google.drive({ version: "v3", auth: auth });
  response = await drive.files.export(param, { responseType: "stream" });
  const dest = fs.createWriteStream(filename);
  response.data.pipe(dest);
  await new Promise((resolve, reject) => {
    dest.on("finish", resolve);
    dest.on("error", reject);
  });
}

async function driveFilesGet(auth, filename, param) {
  var drive = google.drive({ version: "v3", auth: auth });
  response = await drive.files.get(param,
    { responseType: "stream" });
  const dest = fs.createWriteStream(filename);
  response.data.pipe(dest);
  await new Promise((resolve, reject) => {
    dest.on("finish", resolve);
    dest.on("error", reject);
  });
}


async function sheetsSpreadsheets(auth, filename, fileId, formatMime, parametersGid, parametersRange, parametersSheetNumber) {
  // console.log("SheetsSpreadsheets")
  const drive = google.drive('v3');
  const sheets = google.sheets({ version: 'v4', auth });
  //let range = "";
  if (parametersRange || parametersSheetNumber || parametersGid) {
    if (parametersGid) {
    } else if (parametersRange) {
      console.log("SheetsSpreadsheets - range")
      const sheet = await sheets.spreadsheets.get({ spreadsheetId: fileId });
      // const sheetName = sheet.data.sheets[0].properties.title;
      // range = `${sheetName}!A1:Z`;
      console.log(`${filename}\n${fileId}\n${formatMime}\n${range}`);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        ranges: range
      });
      fs.writeFileSync(filename + ".json", JSON.stringify(response.data.values));
      // range = parametersRange;
    } else if (parametersSheetNumber) {
      const sheet = await sheets.spreadsheets.get({ spreadsheetId: fileId });
      const sheetX = sheet.data.sheets[parametersSheetNumber];
      // Get the values in the sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: fileId,
        range: sheetX.properties.title, // use the title of the sheet as the range
      });
      // Convert the values to TSV
      const tsv = response.data.values.map(row => row.join('\t')).join('\n');
      // Write the TSV to a file
      fs.writeFile('output.tsv', tsv, (err) => {
        if (err) throw err;
        console.log('The file has been saved!');
      });
      // range = `${sheetName}!A1:Z`;
    };
  } else {
    console.log("error");
    process.exit(1);
  }
}

async function handleSheet(auth, parameters) {
  console.log("TEMPORARY=" + JSON.stringify(parameters, null, 2));
  const sheets = google.sheets({ version: 'v4', auth });
  for (fileId of parameters.sources) {
    console.log("SheetsSpreadsheets - range")
    const sheet = await sheets.spreadsheets.get({ spreadsheetId: fileId });
    filename = sheet.data.properties.title;
    const range = parameters.options.range.replace(/~/g, "!");
    if (!range) {
      console.error('Range is not defined');
      continue;
    }
    console.log(`${filename}\n${fileId}\n${range}`);
    if (parameters.options.set || parameters.options.setone || parameters.options.file) {
      // Set the values in the sheet to parameters.options.set
      let value;
      if (parameters.options.file) {
        // read the file and set the values in the sheet to the contents of the file
        const data = fs.readFileSync(parameters.options.file, 'utf8');
        value = JSON.parse(data);
      } else if (parameters.options.setone) {
        value = [[parameters.options.setone]];
      } else {
        value = JSON.parse(parameters.options.set);
      };
      const response = await sheets.spreadsheets.values.update({
        spreadsheetId: fileId,
        range: range,
        valueInputOption: 'USER_ENTERED', // or 'RAW'
        resource: {
          values: value // this should be an array of arrays representing the cell values to update
        }
      });
    } else {
      if (parameters.options.getone) {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: fileId,
          range: range
        });
        console.log(response.data.values[0][0]);
      } else {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: fileId,
          range: range
        });
        fs.writeFileSync(filename + ".json", JSON.stringify(response.data.values));
      }
    }
  }
}

async function exportFile(auth, parameters) {
  console.log("TEMPORARY=" + JSON.stringify(parameters, null, 2));
  var drive = google.drive({ version: "v3", auth: auth });
  let fileIds = parameters?.sources;
  const formats = parameters.options.format ? parameters.options.format.split(',') : "-";
  for (const fileId of fileIds) {
    const { data } = await drive.files.get({
      fileId,
      fields: "name, mimeType",
      supportsAllDrives: true
    });
    const name = data.name;
    let response;
    // Check if the file is a Google Workspace document and a format is specified
    let filename = name;
    // Thisshoudl be the outermost if... otherwise media is downloaded multiple times...
    if (data.mimeType.includes('google-apps')) {
      console.log(`${data.mimeType}\t${name}`)
      for (fmt of formats) {
        const formatMime = fmt == "-" ? getMimetype(defaultFormat(data.mimeType)) : getMimetype(fmt); // Assuming format like 'application/pdf' for Google Docs, for example
        const extension = fmt == "-" ? defaultFormat(data.mimeType) : fmt;
        console.log(`---------- ${fmt} -> ${formatMime}`);
        filename = `${name}.${extension}`;
        if (data.mimeType == "application/vnd.google-apps.spreadsheet" && (parameters.gid || parameters.range)) {
          // TODO: Implement this method also for slides.
          await sheetsSpreadsheets(auth, filename, fileId, formatMime, parameters.gid, parameters.range, null);
        } else {
          console.log("Drive")
          await driveFilesExport(auth, filename, {
            fileId,
            mimeType: formatMime,
          });
        };
        console.log(`File "${name}.${extension}" downloaded successfully! `);
      }
    } else {
      // For non-Google Workspace files or when no format conversion is needed
      await driveFilesGet(auth, filename, {
        fileId,
        alt: "media",
      });
      console.log(`Media file "${name}" downloaded successfully! `);
      // For media files, we'll have the wrong format?
    }
  }
}


async function createWormhole(auth, parameters) {
  files = parameters.sources;
  //console.log("TEMPORARY="+JSON.stringify(   parameters   ,null,2))
  //process.exit(1)
  var p1 = "";
  var p2 = "";
  if (parameters.options.oldnew) {
    p1 = "[OBSOLETE_FOLDER] ";
    p2 = "[NEW_FOLDER] ";
  }
  if (parameters.options.migrate) {
    p1 = "[OBSOLETE_SHARED_FOLDER] ";
    p2 = "[NEW_FOLDER_IN_SHARED_DRIVE] ";
  }
  createShortcut(auth, files[0], files[1], p1);
  createShortcut(auth, files[1], files[0], p2);
}

async function createShortcuts(auth, parameters) {
  files = parameters.sources;
  folderId = parameters.options.target;
  files.forEach(async (fileId) => {
    createShortcut(auth, fileId, folderId, "");
  });
}

// https://developers.google.com/drive/api/v3/reference/files/create
// https://developers.google.com/drive/api/v3/shortcuts
async function createShortcut(auth, fileId, folderId, prefix) {
  var drive = google.drive({ version: "v3", auth: auth });
  const title = await getName(auth, fileId);
  if (!prefix) {
    prefix = "";
  }
  // console.log('File Id: ' + fileId);
  console.log("Title: " + title);
  shortcutMetadata = {
    name: prefix + title + " [shortcut]",
    mimeType: "application/vnd.google-apps.shortcut",
    shortcutDetails: {
      targetId: fileId,
    },
  };
  drive.files.create(
    {
      resource: shortcutMetadata,
      fields: "id,name,mimeType,shortcutDetails,parents",
      supportsAllDrives: true
      // parents:  [folderId] , // <-- doesn't work...
    },
    function (err, resp) {
      if (err) {
        // Handle error
        console.error(err);
      } else {
        shortcut = resp.data;
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
    }
  );
}

async function moveFiles(auth, parameters) {
  // runFunction(moveFiles, { sources: source, options: options} );
  files = parameters.sources;
  folderId = parameters.options.target;
  const makeShortCut = parameters.options.shortcut;
  console.log('files: ' + files);
  console.log('folderId: ' + folderId);
  console.log('makeShortCut: ' + makeShortCut);
  files.forEach(async (fileId) => {
    moveOneFile(auth, fileId, folderId, makeShortCut);
  });
}

async function moveOneFile(auth, fileId, folderId, makeShortcut) {
  // https://developers.google.com/drive/api/v3/reference/files/get
  // Retrieve the existing parents to remove
  var drive = google.drive({ version: "v3", auth: auth });
  drive.files.get(
    {
      fileId: fileId,
      fields: "parents",
      supportsAllDrives: true
    },
    function (err, response) {
      if (err) {
        // Handle error
        console.error(err);
        console.log("ERROR ACCESSING^^^");
      } else {
        file = response.data;
        // console.log("TEMPORARY="+JSON.stringify(   file         ,null,2))
        // Move the file to the new folder
        var previousParents = file.parents.join(",");
        if (makeShortcut) {
          // console.log("TEMPORARY="+JSON.stringify(   file.parents         ,null,2))
          createShortcut(auth, fileId, file.parents[0]);
        }
        drive.files.update(
          {
            fileId: fileId,
            addParents: folderId,
            removeParents: previousParents,
            fields: "id, parents",
            supportsAllDrives: true
          },
          function (err, resp) {
            if (err) {
              console.log("oppssss")
              console.log("ERROR: " + JSON.stringify(err, null, 2));
              console.log("ERROR MOVING^^^");
            } else {
              //console.log("Success: "+JSON.stringify(    resp        ,null,2))
              console.log("Moved successfully.");
            }
          }
        );
      }
    }
  );
}

async function createFolders(auth, parameters) {
  if (!parameters) process.exit(1);
  names = parameters.names;
  folderId = parameters.options.target;
  const makeShortCut = parameters.options.shortcut;
  names.forEach(async (name) => {
    createFolder(auth, name, folderId);
  });
}

async function uploadFiles(auth, params) {
  const folderId = params.options.target;
  for (const file of params.names) {
    const id = await uploadFile(auth, file, folderId);
  }
}

function defaultFormat(param) {
  switch (param) {
    case 'application/vnd.google-apps.document':
      return "docx";
    case 'application/vnd.google-apps.presentation': //	Google Slides
      return "pptx";
    case 'application/vnd.google-apps.spreadsheet': //	Google Sheets
      return "xlsx";
    default:
      console.log(`Did not understand type=${param}. Defaulting to pdf`);
      return "pdf";
  }
};

/*
application/vnd.google-apps.audio	
application/vnd.google-apps.document	Google Docs
application/vnd.google-apps.drive-sdk	Third-party shortcut
application/vnd.google-apps.drawing	Google Drawings
application/vnd.google-apps.file	Google Drive file
application/vnd.google-apps.folder	Google Drive folder
application/vnd.google-apps.form	Google Forms
application/vnd.google-apps.fusiontable	Google Fusion Tables
application/vnd.google-apps.jam	Google Jamboard
application/vnd.google-apps.mail-layout	Email layout
application/vnd.google-apps.map	Google My Maps
application/vnd.google-apps.photo	Google Photos
application/vnd.google-apps.presentation	Google Slides
application/vnd.google-apps.script	Google Apps Script
application/vnd.google-apps.shortcut	Shortcut
application/vnd.google-apps.site	Google Sites
application/vnd.google-apps.spreadsheet	Google Sheets
application/vnd.google-apps.unknown	
application/vnd.google-apps.video
*/

function getMimetype(file) {
  switch (file) {
    case "pdf":
      return "application/pdf";
    case "html":
    case "htm":
      return "text/html";
    case "txt":
      return "text/plain";
    case "doc":
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "odt":
      return "application/vnd.oasis.opendocument.text";
    case "xls":
    case "xlsx":
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case "ods":
      return "application/vnd.oasis.opendocument.spreadsheet";
    case "xml":
      return "application/xml";
    case "csv":
      return "text/csv";
    case "tsv":
      return 'text/tab-separated-values';
    case "tmpl":
      return "text/plain";
    case "php":
      return "application/x-httpd-php";
    case "jpg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "bmp":
      return "image/bmp";
    case "js":
      return "application/javascript";
    case "swf":
      return "application/x-shockwave-flash";
    case "mp3":
      return "audio/mpeg";
    case "zip":
      return "application/zip";
    case "rar":
      return "application/x-rar-compressed";
    case "tar":
      return "application/x-tar";
    case "arj":
      return "application/x-arj";
    case "cab":
      return "application/vnd.ms-cab-compressed";
    default:
      console.log(`Did not understand type=${file}`);
      return null;
  }
}

async function collectElements(auth, params) {
  let query = "";
  let queryArr = [];
  console.log("Collecting elements from Google Drive " + JSON.stringify(params));
  if (params.options.format) {
    console.log("FORMAT=" + params.options.format);
    let mimetypes = [];
    params.options.format.forEach(async (type) => {
      const mimetype = getMimetype(type);
      if (!mimetype) return;
      mimetypes.push(mimetype);
    });
    if (mimetypes.length != 0) {
      let qArr = []
      for (const mimetype of mimetypes) {
        qArr.push("mimeType='" + mimetype + "'");
      }
      query = query.slice(0, -4);
      query = "( " + qArr.join("or") + ")";
    }
    queryArr.push(query);
  }
  if (params.options.fileOnly && !params.options.folderOnly)
    queryArr.push("(mimeType!='application/vnd.google-apps.folder')");
  else if (!params.options.fileOnly && params.options.folderOnly)
    queryArr.push("(mimeType='application/vnd.google-apps.folder')");
  if (params.options.name)
    queryArr.push("(name contains '" + params.options.name + "')");
  // Doesn't work:
  //if (params.options.parent)
  // queryArr.push("('" + params.options.parent + "' in parents)");    
  query = queryArr.join(" and ");
  console.log(query);
  const drive = google.drive({ version: "v3", auth });
  const files = [];
  const data = [];
  let jsonData = [];
  let pageToken = null;
  // console.log("q: ", query);
  //   fields: "nextPageToken, files(id, name, mimeType, description, starred, trashed, parents, webViewLink, iconLink, hasThumbnail, thumbnailLink, createdTime, modifiedTime, size, version, owners, lastModifyingUser, shared, permissions, folderColorRgb, originalFilename, fullFileExtension, fileExtension)",
  let listParam = {
    q: query,
    fields: "nextPageToken, files(id, name, mimeType, starred, trashed, createdTime, modifiedTime, version, parents, fullFileExtension, fileExtension)",
    spaces: "drive",
    pageToken: pageToken,
    supportsAllDrives: true
  }
  if (params.options.driveid) {
    listParam = {
      ...listParam,
      corpora: 'drive',
      driveId: params.options.driveid,
      includeItemsFromAllDrives: true,
      orderBy: 'folder,name'
    }
  }
  // console.log(listParam)
  do {
    try {
      const res = await drive.files.list(listParam);
      console.log("TEMPORARY=" + JSON.stringify(res, null, 2))
      Array.prototype.push.apply(files, res.data.files);
      res.data.files.forEach(function (file) {
        // console.log('Found file:', file.name, file.id);        
        data.push([shortenFileName(file), file.id]);
        jsonData.push(file);
      });
      pageToken = res.data.nextPageToken;
    } catch (err) {
      // TODO (developer) - Handle error
      throw err;
    }
  } while (pageToken);
  if (params.options.save) {
    fs.writeFile(params.options.save, JSON.stringify(jsonData, null, 2), (err) => {
      if (err) throw err;
      console.log('Data written to file: ' + params.options.save);
    });
  };
  console.table(data);
}


function shortenFileName(file) {
  const fileExtension = file.name.slice(file.name.lastIndexOf("."));
  let shortenedString = "";
  if (fileExtension.length < 6 && file.name.length > 33)
    shortenedString = file.name.slice(0, 30) + '...' + fileExtension;
  else if (file.name.length > 33)
    shortenedString = file.name.slice(0, 33) + "...";
  else shortenedString = file.name;

  return shortenedString;
}

async function uploadFile(auth, file, folderId) {
  const fileName = path.basename(file);
  const isDirectory = fs.statSync(file).isDirectory();
  if (isDirectory) {
    console.log(`Skipping directory: ${fileName}`);
    return;
  }

  const drive = google.drive({ version: "v3", auth });

  const requestBody = {
    name: fileName,
    parents: [folderId],
    fields: "id",
  };
  const media = {
    body: fs.createReadStream(file),
  };

  try {
    const uploadedFile = await drive.files.create({
      requestBody,
      media,
      supportsAllDrives: true
    });

    console.log("File Id:", uploadedFile.data.id);
    return uploadedFile.data.id;
  } catch (err) {
    // TODO: Handle error
    console.log(err);
  }
}

async function createFolder(auth, name, folderId) {
  var drive = google.drive({ version: "v3", auth: auth });
  var fileMetadata = {
    name: name,
    mimeType: "application/vnd.google-apps.folder",
    parents: [folderId],
    supportsAllDrives: true,
  };
  drive.files.create(
    {
      resource: fileMetadata,
      fields: "id",
      supportsAllDrives: true
    },
    function (err, response) {
      if (err) {
        // Handle error
        console.error(err);
        return null;
      }
      // console.log('Folder Id: ', JSON.stringify(response  ,null,2) );
      console.log(
        "Succes, Folder Id: ",
        JSON.stringify(response.data.id, null, 2)
      );
      fileId = response.data.id;
      return fileId;
    }
  );
}

async function nameOperation(auth, options) {
  console.log(options);
  if (options.options.set) {
    console.log("Set the name: " + options.options.set);
    const res = await renameFile(auth, options.id, options.options.set);
    console.log(res);
  } else if (options.options.append || options.options.prefix) {
    const name = await getName(auth, options.id);
    const res = await renameFile(auth, options.id, options.options.prefix + name + options.options.append);
  } else {
    console.log("Get the name");
    const name_ = await getName(auth, options.id);
    console.log("Name: " + name_);
  }
};

async function getName(auth, id) {
  var drive = google.drive({ version: "v3", auth: auth });
  try {
    //console.log("in");
    const permissions = await drive.permissions.list({
      fileId: id,
      supportsAllDrives: true,
    });

    // The `permissions` object will contain an array of all the permissions for the file
    console.log(permissions.data);
    const res = await drive.files.get({
      fileId: id,
      supportsAllDrives: true
    });
    // console.log("TEMPORARY="+JSON.stringify(    res        ,null,2))
    return res.data.name;
  } catch (err) {
    console.log("ERROR=" + JSON.stringify(err, null, 2));
    return "Title_not_avaiable";
  }
}

/**
 * Prints the title of a sample doc:
 * https://docs.google.com/document/d/195j9eDD3ccgjQRttHhJPymLJUCOUjs-jmwTrekvdjFE/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth 2.0 client.
 */
async function printDocTitle(auth, id) {
  const docs = google.docs({ version: "v1", auth });
  try {
    const res = await docs.documents.get({
      documentId: id,
    });
    //  if (err) {
    //    return console.log('The API returned an error: ' + err);
    //  }
    // console.log("TEMPORARY="+JSON.stringify(    res        ,null,2))
    console.log(`The title of the document is: ${res.data.title}`);
    return res.data.title;
  } catch (e) {
    console.log("TEMPORARY=" + JSON.stringify(e, null, 2));
    return "Title_not_avaiable";
  }
}

async function renameFile(auth, fileId, name) {
  // https://developers.google.com/drive/api/v3/reference/files/get
  // Retrieve the existing parents to remove
  var drive = google.drive({ version: "v3", auth: auth });
  const resource = { name: name };
  drive.files.update(
    {
      fileId: fileId,
      resource: resource,
      supportsAllDrives: true
    },
    function (err, resp) {
      if (err) {
        console.log("ERROR: " + JSON.stringify(err, null, 2));
        console.log("ERROR RENAMING^^^");
      } else {
        console.log("Success: " + JSON.stringify(resp.data, null, 2));
        console.log("Renamed successfully.");
      }
    }
  );
}

async function getTree(auth, options) {
  // https://stackoverflow.com/questions/41741520/how-do-i-search-sub-folders-and-sub-sub-folders-in-google-drive

  // resolve the promises for getting G files and folders
  const getGFilePaths = async () => {
    //update to use Promise.All()
    let gRootFolder = await getGfiles().then(result => { return result[2][0]['parents'][0] })
    let gFolders = await getGfiles().then(result => { return result[1] })
    let gFiles = await getGfiles().then(result => { return result[0] })
    // create the path files and create a new key with array of folder paths, returning an array of files with their folder paths
    return pathFiles = gFiles
      .filter((file) => { return file.hasOwnProperty('parents') })
      .map((file) => ({ ...file, path: makePathArray(gFolders, file['parents'][0], gRootFolder) }))
  }

  // recursive function to build an array of the file paths top -> bottom
  let makePathArray = (folders, fileParent, rootFolder) => {
    if (fileParent === rootFolder) { return [] }
    else {
      let filteredFolders = folders.filter((f) => { return f.id === fileParent })
      if (filteredFolders.length >= 1 && filteredFolders[0].hasOwnProperty('parents')) {
        let path = makePathArray(folders, filteredFolders[0]['parents'][0])
        path.push(filteredFolders[0]['name'])
        return path
      }
      else { return [] }
    }
  }

  // get meta-data list of files from gDrive, with query parameters
  const getGfiles = () => {
    try {
      let getRootFolder = getGdriveList({
        corpora: 'user', includeItemsFromAllDrives: false,
        fields: 'files(name, parents)',
        q: "'root' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'"
      })

      let getFolders = getGdriveList({
        corpora: 'user', includeItemsFromAllDrives: false,
        fields: 'files(id,name,parents), nextPageToken',
        q: "trashed = false and mimeType = 'application/vnd.google-apps.folder'"
      })

      let getFiles = getGdriveList({
        corpora: 'user', includeItemsFromAllDrives: false,
        fields: 'files(id,name,parents, mimeType, fullFileExtension, webContentLink, exportLinks, modifiedTime), nextPageToken',
        q: "trashed = false and mimeType != 'application/vnd.google-apps.folder'"
      })

      return Promise.all([getFiles, getFolders, getRootFolder])
    }
    catch (error) {
      return `Error in retriving a file reponse from Google Drive: ${error}`
    }
  }

  // make call out to gDrive to get meta-data files. Code adds all files in a single array which are returned in pages
  const getGdriveList = async (params) => {
    const drive = google.drive({ version: 'v3', auth: auth });
    let list = [];
    let nextPgToken;
    do {
      let res = await drive.files.list(params);
      list.push(...res.data.files);
      nextPgToken = res.data.nextPageToken;
      params.pageToken = nextPgToken;
    }
    while (nextPgToken);
    return list;
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
const SCOPES = [
  "https://www.googleapis.com/auth/documents.readonly",
  "https://www.googleapis.com/auth/drive",
];
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
    client_id,
    client_secret,
    redirect_uris[0]
  );

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
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("Authorize this app by visiting this url:", authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question("Enter the code from that page here: ", (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error("Error retrieving access token", err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log("Token stored to", TOKEN_PATH);
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
