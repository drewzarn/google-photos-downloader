const server = http
    .createServer(async (req, res) => {
        try {
            // acquire the code from the querystring, and close the web server.
            const qs = new url.URL(req.url, "http://localhost:3000")
                .searchParams;
            const code = qs.get("code");
            console.log(`Code is ${code}`);
            res.end("Authentication successful! Please return to the console.");
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
