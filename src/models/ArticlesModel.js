const _ = require('lodash');
const Article = require('./Article');
const getLastSha = require('./utils/getLastSha');
const blobData = require('./utils/blobData');

const INDEX_KEY = 'article-index';
const HOMEPAGE_KEY = 'homepage-articles';
const IMAGE_KEY = 'images';

const IMG_RE = /^images\/.*(jpg|jpeg|png|gif)$/i;
const MARKDOWN_RE = /\.md$/;
const JSON_RE = /\.json$/;
const BACKUPS_RE = /\.backups/;

module.exports = class ArticlesModel {
  constructor(github, redis, prefix) {
    this.github = github;
    this.redis = redis;
    this.prefix = prefix;
  }

  /* --------- properties --------- */

  get prefix() {
    return this._prefix || '';
  }

  set prefix(value) {
    this._prefix = value;
  }

  get redis() {
    return this._redis;
  }

  set redis(value) {
    this._redis = value;
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

  get indexRedisPath() {
    return `${this.prefix}${INDEX_KEY}`;
  }
  get imageRedisPath() {
    return `${this.prefix}${IMAGE_KEY}`;
  }

  /** ----------- methods ------------- */

  purge() {
    return this.redis.keys(`${this.prefix}*`)
      .then(
        (keys) => Promise.all(keys.map((key) => this.redis.del(key)))
      )
  }

  purgeImageIndex() {
    return this.redis.del(this.imageRedisPath);
  }

  purgeHomepageIndex() {
    return this.redis.del(this.homepageRedisPath);
  }

  purgeArticleIndex() {
    // @TODO: test! doesn't work I think
    return this.redis.del(this.indexRedisPath);
  }

  setHomepageIndex(path) {
    try {
      return this.redis.rpush(this.homepageRedisPath, path);
    } catch (err) {
      console.log('error setting homepage path: ', path, err.message);
    }
  }

  getHomepages() {
    return this.redis.llen(this.homepageRedisPath)
      .then((len) => this.redis.lrange(this.homepageRedisPath, 0, len))
  }

  getIndexData(sha) {
    return this.github.gitdata.getTree({
      owner: 'bingomanatee',
      repo: 'wonderland_labs_content',
      sha,
      recursive: 1
    })
  }

  isImage(item) {
    return IMG_RE.test(item.path);
  }

  isArticle(item) {
    return MARKDOWN_RE.test(item.path) && (!BACKUPS_RE.test(item.path));
  }

  isMetadata(item) {
    return JSON_RE.test(item.path) && (!BACKUPS_RE.test(item.path));
  }

  getArticleList() {
    return this.redis.hgetall(this.indexRedisPath);
  }

  listArticle(path, sha) {
    return this.redis.hset(this.indexRedisPath, path, sha);
  }

  listImage(path, sha) {
    return this.redis.hset(this.imageRedisPath, path, sha);
  }

  getImage(path) {
    return this.redis.hget(this.imageRedisPath, path)
      .then((sha) => blobData(this.github, sha));
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

  getChapter(chapter) {
    console.log('getting chapter: ', chapter);
    let re = new RegExp(`^articles/${chapter}/`);
    return this.getArticleList()
      .then((articleList) => {
        return Promise.all(_(articleList)
          .keys()
          .filter((articlePath) => re.test(articlePath))
          .map((articlePath) => {
            return this.getArticle(articlePath);
          })
          .value()
        );
      });
  }

  recordArticleMetadata(item) {
    let path = item.path.replace(/\.json$/, '.md');
    let article = new Article(this.github, this.redis, {path: path, prefix: this.prefix});
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
  }

  recordMetadata(tree) {
    return this.purgeHomepageIndex()
      .then(() => Promise.all(
        _(tree)
          .filter(this.isMetadata)
          .map((item) => this.recordArticleMetadata(item))
          .value()
        )
      )
  }

  recordImages(tree) {
    return this.purgeImageIndex()
      .then(() => Promise.all(
        _(tree)
          .filter(this.isImage)
          .map((item) => this.listImage(item.path, item.sha))
          .value()
        )
      )
  }

  load() {
    return Promise.all([
      this.redis.del(this.prefix + HOMEPAGE_KEY),
      this.redis.del(this.prefix + INDEX_KEY)
    ])
      .then(() => getLastSha(this.github))
      .then((sha) => this.getIndexData(sha))
      .then((data) => Promise.all([
          this.recordArticles(data.tree),
          this.recordMetadata(data.tree),
          this.recordImages(data.tree)
        ]
        ) // end all
      ) // end then
  }

  getArticle(path) {
    let data = {path, prefix: this.prefix};
    return this.redis.hget(this.indexRedisPath, path)
      .then((sha) => {
        if (!sha) {
          throw new Error(`cannot find sha for ${path}`);
        }
        data.sha = sha;
        let article = new Article(this.github, this.redis, data);
        return article.readMetadata()
          .then(() => article);
      })
  }
}