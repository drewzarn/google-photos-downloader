const { PromisedDatabase } = require("promised-sqlite3");

const db = new PromisedDatabase();

async function init() {
    await db.open("./photos.sqlite3");
    await db.run(
        "CREATE TABLE IF NOT EXISTS config(key TEXT  PRIMARY KEY, value TEXT)"
    );
    await db.run(
        "CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY, created DATETIME, year INT, month INT, day INT, baseurl TEXT, filename TEXT, status VARCHAR(10) DEFAULT 'new')"
    );
    await db.run(
        "CREATE TABLE IF NOT EXISTS photometadata(id TEXT PRIMARY KEY, description TEXT, metadata TEXT, contributorInfo TEXT)"
    );
}
init();

exports.cleanup = async () => {
    await db.run("DELETE FROM photos");
    await db.run("DELETE FROM photometadata");
    await this.resetTokens();
};

exports.resetTokens = async () => {
    await db.run("DELETE FROM config WHERE key='tokens'");
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

exports.addPhoto = mediaItem => {
    let cDate = new Date(mediaItem.mediaMetadata.creationTime);
    db.run(
        "INSERT INTO photos (id, created, year, month, day, baseurl, filename) VALUES ($id, $created, $year, $month, $day, $baseurl, $filename)",
        {
            $id: mediaItem.id,
            $created: mediaItem.mediaMetadata.creationTime,
            $year: cDate.getFullYear(),
            $month: cDate.getMonth() + 1,
            $day: cDate.getDate(),
            $baseurl: mediaItem.baseUrl,
            $filename: mediaItem.filename
        }
    );
    db.run(
        "INSERT INTO photometadata (id, description, metadata, contributorInfo) VALUES ($id, $description, $metadata, $contributorInfo)",
        {
            $id: mediaItem.id,
            $description: mediaItem.description,
            $metadata: JSON.stringify(mediaItem.mediaMetadata),
            $contributorInfo: JSON.stringify(mediaItem.contributorInfo)
        }
    );
};
