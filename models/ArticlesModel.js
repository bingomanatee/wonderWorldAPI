const _ = require('lodash');
const Article = require('./Article');
const getLastSha = require('./utils/getLastSha');

const INDEX_KEY = 'article-index';
const HOMEPAGE_KEY = 'homepage-articles';

module.exports = class ArticlesModel {
  constructor(github, redisClient, prefix) {
    this.github = github;
    this.redisClient = redisClient;
    this.prefix = prefix;
  }

  get prefix() {
    return this._prefix || '';
  }

  set prefix(value) {
    this._prefix = value;
  }

  get redisClient() {
    return this._redisClient;
  }

  set redisClient(value) {
    this._redisClient = value;
  }

  get github() {
    return this._github;
  }

  set github(value) {
    this._github = value;
  }

  get homepageRedisPath() {
    return `${this.prefix}${HOMEPAGE_KEY}`;
  }

  purgeHomepageIndex() {
    return this.redisClient.del(this.homepageRedisPath);
  }

  purgeArticleIndex() {
    return this.redisClient.del(this.indexRedisPath);
  }

  setHomepageIndex(path) {
    try {
      return this.redisClient.rpush(this.homepageRedisPath, path)
    } catch (err) {
      console.log('error setting homepage path: ', path, err.message);
    }
  }

  getHomepages() {
    return this.redisClient.llen(this.homepageRedisPath)
      .then((len) => this.redisClient.lrange(this.homepageRedisPath, 0, len))
  }

  getIndexData(sha) {
    return this.github.gitdata.getTree({
      owner: 'bingomanatee',
      repo: 'wonderland_labs_content',
      sha,
      recursive: 1
    })
  }

  isArticle(item) {
    return /\.md$/.test(item.path) && (!/\.backups/.test(item.path));
  }

  isMetadata(item) {
    return /\.json$/.test(item.path) && (!/\.backups/.test(item.path));
  }

  get indexRedisPath() {
    return `${this.prefix}${INDEX_KEY}`;
  }

  getArticleList() {
    return this.redisClient.hgetall(this.indexRedisPath)
  }

  listArticle(path, sha) {
    return this.redisClient.hset(this.indexRedisPath, path, sha);
  }

  recordArticles(tree) {
    // recording the path and sha of each .md file
    return this.purgeArticleIndex()
      .then(() => Promise.all(_(tree)
        .filter(this.isArticle)
        .map((item) => {
          try {
            return this.listArticle(item.path, item.sha);
          } catch (err) {
            console.log('error in hset of  INDEX: ', item.path, item.sha, ':', err.message);
          }
        })
        .compact()
        .value()));
  }

  recordMetadata(tree) {
    return this.purgeHomepageIndex()
      .then(() => Promise.all(
        _(tree)
          .filter(this.isMetadata)
          .map((item) => {
            let path = item.path.replace(/\.json$/, '.md');
            let article = new Article(this.github, this.redisClient, {path: path, prefix: this.prefix});
            return article.purgeMetadata()
              .then(() => article.loadMetadata(item))
              .then(() => {
                if (article.on_homepage && (!article.hide)) {
                  try {
                    return this.setHomepageIndex(path);
                  } catch (err) {
                    console.log('error lpushing: ', article.path, err.message);
                  }
                }
              })
          })
          .value()
        )
      )
  }

  load() {
    return Promise.all([
      this.redisClient.del(this.prefix + HOMEPAGE_KEY),
      this.redisClient.del(this.prefix + INDEX_KEY)
    ])
      .then(() => getLastSha(this.github))
      .then((sha) => this.getIndexData(sha))
      .then((data) => Promise.all([
          this.recordArticles(data.tree),
          this.recordMetadata(data.tree)
        ]
        ) // end all
      ) // end then
  }

  set articlesList(value) {
    throw new Error('deprecating articlesList')
    this._articlesList = value;
  }

  getArticle(path, withContent) {
    /*
     console.log('loading path:', path);
     const key = `${path}.md`;
     return new Promise((resolve, reject) => {
     if (!this.articlesList.has(key)) {
     console.log('no key found: ', path);
     return reject(new Error(`cannot find ${key}`));
     }
     const article = this.articlesList.get(key);
     if ((!withContent) || article.contentLoaded) {
     resolve(article);
     } else {
     article.load()
     .then(() => resolve(article));
     }
     });
     */
  }
}