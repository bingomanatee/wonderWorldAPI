var express = require('express');
var router = express.Router();
const redis = require('./../models/utils/redis');
let art = require('./../models/articles');
const articles = art.articles;
const HOME_PAGE_CACHE_PATH = art.HOME_PAGE_CACHE_PATH;

/* GET users listing. */
router.get('/homepage', function (req, res, next) {
  redis.exists(HOME_PAGE_CACHE_PATH)
    .then((exists) => {
      if (exists) {
        redis.get(HOME_PAGE_CACHE_PATH)
          .then((cache) => res.send(JSON.parse(cache)));
      } else {
        articles.getHomepages()
          .then((homepages) => {
            Promise.all(homepages.map((path) => articles.getArticle(path)))
              .then((articles) => {
                let homepageContent = articles.map((article) => article.toJSON());
                redis.set(HOME_PAGE_CACHE_PATH, JSON.stringify(homepageContent))
                  .then(() => {
                    redis.expire(HOME_PAGE_CACHE_PATH, 30);
                    res.send(homepageContent);
                  });
              });
          });
      }
    });
});

router.get('/chapter/:chapter', function (req, res, next) {
  articles.getChapter(req.params.chapter)
    .then((chapterArticles) => {
 //   console.log('chapterArticles: ', chapterArticles);
      res.send(chapterArticles.map((article) => article.toJSON()));
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
