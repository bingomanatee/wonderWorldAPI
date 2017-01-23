var express = require('express');
var router = express.Router();
let github = require('./../models/utils/github');
const redis = require('./../models/utils/redis');

const art = require('./../models/articles');
const articles = art.articles;

/* GET an image from github. */
router.get('*', function (req, res, next) {
  const key = `images${req.url}`;
  articles.getImage(key)
    .then((image) => {
      return res.send(image);
    })
});

module.exports = router;
