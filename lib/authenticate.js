const { OAuth2Client } = require("google-auth-library");
const http = require("http");
const url = require("url");
const open = require("open");
const destroyer = require("server-destroy");

// Download your OAuth2 configuration from the Google
const keys = require("../secrets/oauth.json");

/**
 * Start by acquiring a pre-authenticated oAuth2 client.
 */
function authenticate() {
    return new Promise((resolve, reject) => {
        resolve(getAuthenticatedClient());
    });
}

/**
 * Create a new OAuth2Client, and go through the OAuth2 content
 * workflow.  Return the full client to the callback.
 */
function getAuthenticatedClient() {
    return new Promise((resolve, reject) => {
        // create an oAuth client to authorize the API call.  Secrets are kept in a `keys.json` file,
        // which should be downloaded from the Google Developers Console.
        const oAuth2Client = new OAuth2Client(
            keys.web.client_id,
            keys.web.client_secret,
            keys.web.redirect_uris[0]
        );

        oAuth2Client.on("tokens", tokens => {
            if (tokens.refresh_token) {
                // store the refresh_token in my database!
                console.log("Refresh token", tokens.refresh_token);
            }
            console.log("Access token", tokens.access_token);
        });

        // Generate the url that will be used for the consent dialog.
        const authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: "offline",
            scope: "https://www.googleapis.com/auth/photoslibrary.readonly"
        });

        // Open an http server to accept the oauth callback. In this simple example, the
        // only request to our webserver is to /oauth2callback?code=<code>
        const server = http
            .createServer(async (req, res) => {
                try {
                    // acquire the code from the querystring, and close the web server.
                    const qs = new url.URL(req.url, "http://localhost:3000")
                        .searchParams;
                    const code = qs.get("code");
                    console.log(`Code is ${code}`);
                    res.end(
                        "Authentication successful! Please return to the console."
                    );
                    server.destroy();

                    // Now that we have the code, use that to acquire tokens.
                    const r = await oAuth2Client.getToken(code);
                    // Make sure to set the credentials on the OAuth2 client.
                    oAuth2Client.setCredentials(r.tokens);
                    console.info("Tokens acquired.", oAuth2Client.credentials);
                    resolve(oAuth2Client);
                } catch (e) {
                    console.error(e);
                    reject(e);
                }
            })
            .listen(3000, () => {
                console.log("Server started on port 3000");
                // open the browser to the authorize url to start the workflow
                open(authorizeUrl, { wait: false }).then(cp => cp.unref());
            });
        destroyer(server);
    });
}

module.exports = { authenticate };
