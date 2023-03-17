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

    if (mediaItems) {
        let addCount = 0;
        for (const mediaItem of mediaItems) {
            addCount += await db.addPhoto(mediaItem);
        }
        console.log(
            `Added ${addCount} of ${
                mediaItems.length
            } photos to database. Total photos: ${await db.getPhotoCount()}`
        );
    }

    if (nextPageToken) {
        getMediaItemsPage(auth, nextPageToken);
    }
};

const getMediaItemsPage = (auth, pageToken) => {
    if (auth.credentials.expiry_date < moment().unix() * 1000) {
        console.error("Credentials expired");
        return;
    }

    let mediaItemsUri = MEDIA_ITEMS_URI + "?pageSize=100";

    if (pageToken) {
        mediaItemsUri += `&pageToken=${pageToken}`;
        db.setLastPageToken(pageToken);
    }

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
