var express = require('express');
var router = express.Router();
let github = require('./../models/utils/github');
const redisClient = require('../models/utils/redisClient');

let articles = require('./../models/articles')(github, redisClient, 'live');
redisClient.flushall()
  .then(() => articles.load());

/* GET users listing. */
router.get('/homepage', function (req, res, next) {
  articles.getHomepages()
    .then((homepages) => {
      Promise.all(homepages.map((path) => articles.getArticle(path)))
        .then((articles) => {
          res.send(articles.map((article) => article.toJSON()));
        });
    });
});

router.get('/article/:path', function (req, res, next) {
  articles.getArticle(req.params.path + '.md')
    .then((article) => {
      article.content()
        .then((content) => {
          let out = article.toJSON();
          out.content = content;
          res.send(out);
        });
    })
    .catch((err) => {
      console.log('error in articles.load:', err.message);
      res.status(404).send({error: err.message});
    });
});

module.exports = router;
