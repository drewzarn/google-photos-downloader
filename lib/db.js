const { PromisedDatabase } = require("promised-sqlite3");

const db = new PromisedDatabase();

async function init() {
    await db.open("./photos.sqlite3");
    await db.run(
        "CREATE TABLE IF NOT EXISTS config(key TEXT  PRIMARY KEY, value TEXT)"
    );
    await db.run(
        "CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY, created DATETIME, year INT, month INT, day INT, baseurl TEXT, urlexpires DATETIME, filename TEXT, status VARCHAR(10) DEFAULT 'new', localfile TEXT)"
    );
    await db.run(
        "CREATE TABLE IF NOT EXISTS photometadata(id TEXT PRIMARY KEY, description TEXT, metadata TEXT, contributorInfo TEXT)"
    );
}
init();

exports.cleanup = async () => {
    await db.run("DELETE FROM photos");
    await db.run("DELETE FROM photometadata");
    await this.resetAuth();
};

exports.resetAuth = async () => {
    await db.run("DELETE FROM config WHERE key='tokens'");
};

exports.resetPageToken = async () => {
    await db.run("DELETE FROM config WHERE key='lastPageToken'");
};

exports.getCredentials = async () => {
    let tokens = await db.get(
        "SELECT value FROM config WHERE key='tokens' AND json_extract(value, '$.expiry_date')/1000 > CAST(strftime('%s') AS decimal)"
    );
    if (tokens) {
        tokens = JSON.parse(tokens.value);
    }
    return tokens;
};

exports.addCredentials = tokens => {
    db.run("REPLACE INTO config (key, value) VALUES ('tokens', $tokens)", {
        $tokens: JSON.stringify(tokens)
    });
};

exports.setLastPageToken = pageToken => {
    db.run(
        "REPLACE INTO config (key, value) VALUES ('lastPageToken', $pageToken)",
        {
            $pageToken: pageToken
        }
    );
};

exports.getLastPageToken = async () => {
    let pageToken = await db.get(
        "SELECT value FROM config WHERE key='lastPageToken'"
    );
    if (pageToken) {
        pageToken = pageToken.value;
    }
    return pageToken;
};

exports.getPhotoCount = async () => {
    let count = await db.get("SELECT COUNT(*) AS count FROM photos");
    return count.count;
};

exports.addPhoto = async (mediaItem, replace = false) => {
    let cDate = new Date(mediaItem.mediaMetadata.creationTime);
    let exists = await db.get(
        "SELECT COUNT(*) AS count FROM photos WHERE id = $id",
        { $id: mediaItem.id }
    );
    if (exists.count > 0 && !replace) {
        return 0;
    }
    let oneHour = new Date().setHours(new Date().getHours() + 1);
    db.run(
        "REPLACE INTO photos (id, created, year, month, day, baseurl, urlexpires, filename) VALUES ($id, $created, $year, $month, $day, $baseurl, $urlexpires, $filename)",
        {
            $id: mediaItem.id,
            $created: mediaItem.mediaMetadata.creationTime,
            $urlexpires: oneHour,
            $year: cDate.getFullYear(),
            $month: cDate.getMonth() + 1,
            $day: cDate.getDate(),
            $baseurl: mediaItem.baseUrl,
            $filename: mediaItem.filename
        }
    );
    db.run(
        "REPLACE INTO photometadata (id, description, metadata, contributorInfo) VALUES ($id, $description, $metadata, $contributorInfo)",
        {
            $id: mediaItem.id,
            $description: mediaItem.description,
            $metadata: JSON.stringify(mediaItem.mediaMetadata),
            $contributorInfo: JSON.stringify(mediaItem.contributorInfo)
        }
    );

    return 1;
};

exports.updatePhotoUrl = async (id, baseUrl) => {
    let oneHour = new Date().setHours(new Date().getHours() + 1);
    db.run(
        "UPDATE photos SET baseurl = $baseurl, urlexpires = $urlexpires WHERE id = $id",
        {
            $id: id,
            $urlexpires: oneHour,
            $baseurl: baseUrl
        }
    );
};

exports.getPhoto = async mediaItemId => {
    let photo = await db.get(
        "SELECT p.id, baseurl, filename, metadata AS mediaMetadata FROM photos p JOIN photometadata m ON p.id=m.id WHERE p.id = $id",
        { $id: mediaItemId }
    );

    return photo;
};

exports.getPhotoToDownload = async () => {
    let photo = await db.get(
        "SELECT p.id, baseurl, filename, metadata AS mediaMetadata FROM photos p JOIN photometadata m ON p.id=m.id WHERE status = 'new' AND urlexpires > CAST(strftime('%s') AS decimal) ORDER BY p.id LIMIT 1"
    );
    if (photo) {
        await db.run(
            "UPDATE photos SET status = 'downloading' WHERE id = $id",
            { $id: photo.id }
        );
    } else {
        let photo = await db.get(
            "SELECT p.id, baseurl, filename, metadata AS mediaMetadata FROM photos p JOIN photometadata m ON p.id=m.id WHERE status = 'new' AND urlexpires < CAST(strftime('%s') AS decimal) ORDER BY p.id LIMIT 1"
        );
        if (photo) {
        }
    }
    return photo;
};

exports.markPhotoDownloaded = async id => {
    await db.run("UPDATE photos SET status = 'downloaded' WHERE id = $id", {
        $id: id
    });
};

exports.markPhotoDownloadFailed = async id => {
    await db.run("UPDATE photos SET status = 'downloadfailed' WHERE id = $id", {
        $id: id
    });
};
