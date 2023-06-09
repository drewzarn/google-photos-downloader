const { OAuth2Client } = require("google-auth-library");
const { authenticate } = require("./lib/authenticate");
const photos = require("./lib/photos");
const download = require("./lib/download");
const db = require("./lib/db");

const action = process.argv[2]?.toLowerCase() ?? "download";

reAuth = () => {
    db.getCredentials().then(credentials => {
        authenticate(credentials).then(async oAuth2Client => {
            oAuth2Client.refreshAccessToken((error, tokens) => {
                if (error) {
                    console.error(error);
                } else {
                    console.log("Access token updated");
                    db.addCredentials(tokens);
                }
            });
        });
    });
};

setInterval(() => {
    reAuth();
}, 60 * 15 * 1000);
reAuth();

switch (action) {
    case "synclibrary":
        db.getCredentials().then(credentials => {
            console.log(credentials);
            authenticate(credentials).then(async oAuth2Client => {
                db.addCredentials(oAuth2Client.credentials);
                let lastPageToken = await db.getLastPageToken();
                console.log(lastPageToken);
                photos.getMediaItemsPage(oAuth2Client, lastPageToken);
            });
        });
        break;
    case "download":
        download.downloadMediaItems();
        break;
    case "resetsyncpage":
        db.resetPageToken();
        break;
    case "cleanup":
        db.cleanup();
        break;
    case "resetdownloads":
        db.clearAllDownloads();
        break;
    case "resetauth":
        db.resetAuth();
        break;
    default:
        console.error("Unknown action", action);
        break;
}
