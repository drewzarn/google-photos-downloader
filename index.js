const { OAuth2Client } = require("google-auth-library");
const { authenticate } = require("./lib/authenticate");
const photos = require("./lib/photos");
const db = require("./lib/db");

const action = process.argv[2]?.toLowerCase() ?? "synclibrary";

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
        break;
    case "resetsyncpage":
        db.resetPageToken();
        break;
    case "cleanup":
        db.cleanup();
        break;
    case "resetauth":
        db.resetAuth();
        break;
    default:
        console.error("Unknown action", action);
        break;
}
