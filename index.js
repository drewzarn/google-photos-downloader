const { OAuth2Client } = require("google-auth-library");
const { authenticate } = require("./lib/authenticate");
const { downloadMedia } = require("./lib/download-media");

const action = process.argv[2] ?? "download";

authenticate().then(oAuth2Client => {
    console.log("OAuth2Client:", oAuth2Client);
    downloadMedia(oAuth2Client, action);
});
