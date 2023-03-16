const { OAuth2Client } = require("google-auth-library");
const { authenticate } = require("./lib/authenticate");
const photos = require("./lib/photos");
const db = require("./lib/db");

const action = process.argv[2]?.toLowerCase() ?? "download";

switch (action) {
    case "synclibrary":
        db.getCredentials().then(credentials => {
            console.log(credentials);
            authenticate(credentials).then(oAuth2Client => {
                db.addCredentials(oAuth2Client.credentials);
                photos.getMediaItemsPage(oAuth2Client);
            });
        });
        break;
    case "download":
        break;
    case "cleanup":
        db.cleanup();
        break;
    case "resetauth":
        db.resetTokens();
        break;
    default:
        console.error("Unknown action", action);
        break;
}
