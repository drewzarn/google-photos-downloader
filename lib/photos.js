const { MEDIA_ITEMS_URI, MEDIA_ITEMS_ROOT } = require("../config");
const db = require("./db.js");
const { authenticate } = require("./authenticate");

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
    } else if (response.data.id) {
        //Single media item, update the URL
        db.updatePhotoUrl(response.data.id, response.data.baseUrl);
        return response.data;
    }

    if (nextPageToken) {
        exports.getMediaItemsPage(auth, nextPageToken);
    } else {
        db.resetPageToken();
        console.log("No more media items found");
    }
};

exports.getMediaItemsPage = (auth, pageToken) => {
    if (auth.credentials.expiry_date < moment().unix() * 1000 - 300) {
        console.error("Credentials expired");
        auth = authenticate(auth.credentials);
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

exports.refreshPhotoUrl = async mediaItemId => {
    let credentials = await db.getCredentials();
    let response = await axios.get(
        "https://photoslibrary.googleapis.com/v1/mediaItems/" + mediaItemId,
        {
            headers: {
                Authorization: `Bearer ${credentials.access_token}`
            }
        }
    );
    return await processMediaItemsPageResponse(null, response);
};
