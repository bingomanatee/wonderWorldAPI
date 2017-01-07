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
    return  this.github.gitdata.getTree({
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

  load() {
    return Promise.all([
      this.redisClient.del(this.prefix + HOMEPAGE_KEY),
      this.redisClient.del(this.prefix + INDEX_KEY)
    ])
      .then(() => {
        return new Promise((resolve, reject) => {
          getLastSha(this.github)
            .then((sha) => this.getIndexData(sha))
            .then((data) => {

            console.log('data from index: ', data);
              // recording the path and sha of each .md file
              _(data.tree)
                .filter(this.isArticle)
                .each((item) => this.redisClient.hset(this.prefix + INDEX_KEY, item.path, item.sha));

              _(data.tree)
                .filter(this.isMetadata)
                .each((item) => {
                  let path = item.path.replace(/\.json$/, '.md');
                  let article = new Article(this.github, this.redisClient, {path: path, prefix: this.prefix});
                  article.purgeMetadata()
                    .then(() => article.loadMetadata(item))
                    .then(() => {
                      if (article.on_homepage && (!article.hide)) {
                        this.redisClient.lpush(this.prefix + HOMEPAGE_KEY, article.path);
                      }
                    })
                    .catch((err) => { console.log('error writing file: ', JSON.stringify(err))})
                });
            }).catch((err) => {
            reject(err);
          });
        });
      })
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