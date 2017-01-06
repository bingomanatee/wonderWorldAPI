var express = require('express');
var router = express.Router();
let github = require('./../models/utils/github');
const redisClient = require('./utils/redisClient');

let articles = require('./../models/articles')(github, redisClient);
articles.getArticles();
/* GET users listing. */
router.get('/homepage', function (req, res, next) {
  let out = [];
  res.send(out);
});

router.get('/article/:path', function (req, res, next) {
  articles.getArticle(req.params.path, true)
    .then((article) => article.jsonWithContent())
    .then((json) => res.send(json))
    .catch((err) => {
      console.log('error in articles.load:', err.message);
      res.status(404).send({error: err.message});
    });
});

module.exports = router;
