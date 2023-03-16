const { MEDIA_ITEMS_URI, MEDIA_ITEMS_ROOT } = require("../config");
const db = require("./db.js");

const fs = require("fs");
const path = require("path");
const url = require("url");

const filecompare = require("filecompare");
const download = require("download");
const moment = require("moment");
const mkdirp = require("mkdirp");
const axios = require("axios");

const processMediaItemsPageResponse = async (auth, response) => {
    const { mediaItems, nextPageToken } = response.data;
    const firstPage = !url.parse(response.request.path).query;
    let firstItem = true;

    for (const mediaItem of mediaItems) {
        db.addPhoto(mediaItem);
    }

    if (nextPageToken) {
        getMediaItemsPage(auth, nextPageToken);
    }
};

const getMediaItemsPage = (auth, pageToken) => {
    let mediaItemsUri = MEDIA_ITEMS_URI + "?pageSize=100";

    if (pageToken) {
        mediaItemsUri += `&pageToken=${pageToken}`;
    }

    console.log("Requesting", mediaItemsUri);
    axios
        .get(mediaItemsUri, {
            headers: {
                Authorization: `Bearer ${auth.credentials.access_token}`
            }
        })
        .then(processMediaItemsPageResponse.bind(null, auth))
        .catch(err => {
            console.error("Photos API request failed with message:", err);
        });
};

module.exports = { getMediaItemsPage };
