const fs = require("fs");
const path = require("path");
const url = require("url");

const filecompare = require("filecompare");
const download = require("download");
const moment = require("moment");
const mkdirp = require("mkdirp");

const db = require("./db.js");
const photos = require("./photos.js");

const { MEDIA_ITEMS_ROOT } = require("../config");

const getUniqueFilePath = filePath => {
    const parsedFilePath = path.parse(filePath);
    // Matches for filenames with a macOS style incrementer attached, capturing
    // the contents of the parens.
    // e.g. "foobar (1).jpg" is captured as "1"
    const parenContentRegEx = /(?<=\()[^)]+(?=\))/;
    const incrementMatch = parsedFilePath.name.match(parenContentRegEx);

    if (incrementMatch) {
        parsedFilePath.name = parsedFilePath.name.replace(
            parenContentRegEx,
            parseInt(incrementMatch) + 1
        );
    } else {
        parsedFilePath.name += "-1";
    }
    parsedFilePath.base = parsedFilePath.name + parsedFilePath.ext;
    return path.format(parsedFilePath);
};

const writeFileSyncSafely = (filePath, data) => {
    let newFilePath;

    if (fs.existsSync(filePath)) {
        newFilePath = getUniqueFilePath(filePath);
        writeFileSyncSafely(newFilePath, data);
        filecompare(filePath, newFilePath, isEqual => {
            if (isEqual) {
                fs.unlinkSync(newFilePath);
                console.log("Removed duplicate file", newFilePath);
            }
        });
    } else {
        fs.writeFileSync(filePath, data);
        console.log("Successfully wrote file", filePath);
    }
};

exports.downloadMediaItems = () => {
    db.getPhotoToDownload().then(async photo => {
        if (photo) {
            if (await processMediaItem(photo, MEDIA_ITEMS_ROOT)) {
                await db.markPhotoDownloaded(photo.id);
            } else {
                await db.markPhotoDownloadFailed(photo.id);
            }
            this.downloadMediaItems();
        } else {
            console.log("No more photos to download");
        }
    });
};

const downloadMediaItem = (mediaItem, directory, retry = true) => {
    const parameter = mediaItem.mediaMetadata.video ? "=dv" : "=d";

    return download(mediaItem.baseurl + parameter)
        .then(data => {
            const filePath = `${directory}/${mediaItem.filename}`;

            try {
                writeFileSyncSafely(filePath, data);
                return true;
            } catch (err) {
                console.error(err);
                return false;
            }
        })
        .catch(async err => {
            if (retry) {
                console.log(`Refreshing URL for ${mediaItem.id}`);
                await photos.refreshPhotoUrl(mediaItem.id);
                mediaItem = await db.getPhoto(mediaItem.id);
                return downloadMediaItem(mediaItem, directory, false);
            }
            if (err.response && err.response.status === 403) {
                console.log(`403 for ${mediaItem.id}. Skipping...`);
            } else {
                console.error(err);
            }
            return false;
        });
};

const processMediaItem = mediaItem => {
    const creationTime = moment(mediaItem.mediaMetadata.creationTime);
    const year = creationTime.format("YYYY");
    const month = creationTime.format("MM");
    const day = creationTime.format("DD");
    const directory = `${MEDIA_ITEMS_ROOT}/${year}/${month}/${day}`;

    try {
        mkdirp.sync(directory);
        try {
            return downloadMediaItem(mediaItem, directory);
        } catch (err) {
            console.error(err);
        }
    } catch (err) {
        console.error(err);
    }
};
