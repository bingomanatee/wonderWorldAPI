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

  recordArticles(tree) {
    // recording the path and sha of each .md file
    return _(tree)
      .filter(this.isArticle)
      .map((item) => this.redisClient.hset(this.prefix + INDEX_KEY, item.path, item.sha))
      .value()
  }

  recordMetadata(tree) {
    return _(tree)
      .filter(this.isMetadata)
      .map((item) => {
        let path = item.path.replace(/\.json$/, '.md');
        let article = new Article(this.github, this.redisClient, {path: path, prefix: this.prefix});
        return article.purgeMetadata()
          .then(() => article.loadMetadata(item))
          .then(() => {
            if (article.on_homepage && (!article.hide)) {
              this.redisClient.lpush(this.prefix + HOMEPAGE_KEY, article.path);
            }
          })
      })
      .value();
  }

  load() {
    return Promise.all([
      this.redisClient.del(this.prefix + HOMEPAGE_KEY),
      this.redisClient.del(this.prefix + INDEX_KEY)
    ])
      .then(() => getLastSha(this.github))
      .then((sha) => this.getIndexData(sha))
      .then((data) => Promise.all(
        this.recordArticles(data.tree)
          .concat(
            this.recordMetadata(data.tree)
          )
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