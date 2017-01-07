'use strict';
const _ = require('lodash');
const path = require('path');
module.exports = class Article {

  constructor(github, redisClient, data) {
    this.path = data.path;
    this.sha = data.sha;
    this.prefix = data.prefix;
    this.data = data;
    this.hide = false;
    this.title = path.basename(this.path, '.md');
    this.intro = '';
    this.revised = '';
    this.github = github;
    this.redisClient = redisClient;
  }

  get prefix() {
    return this._prefix || '';
  }

  set prefix(value) {
    if (!value) throw new Error('prefix must exist');
    this._prefix = value;
  }

  get github() {
    return this._github;
  }

  set github(value) {
    this._github = value;
  }

  get redisClient() {
    return this._redisClient;
  }

  set redisClient(value) {
    this._redisClient = value;
  }

  contentLoaded() {
    return this.redisClient.exists(this.redisPath);
  }

  metaLoaded() {
    return this.redisClient.exists(this.redisMetaPath);
  }

  get redisPath() {
    return this.prefix + this.path.replace('/', ':');
  }

  load() {
    return this.github.gitdata.getBlob({
      sha: this.sha,
      owner: 'bingomanatee',
      repo: 'wonderland_labs_content',
      page: 1
    }).then((result) => {
      let content = Buffer.from(result.content, 'base64');
      redisClient.set(this.redisPath, content.toString());
    });
  }

  get redisMetaPath() {
    return `${this.redisPath}:meta`
  }

  purgeMetadata() {
    return this.redisClient.del(this.redisMetaPath);
  }

  loadMetadata(data) {
    return this.metaLoaded()
      .then((loaded) => {
        if (loaded) {
          this.redisClient.get(this.redisMetaPath)
            .then((result) => {
              console.log('result of redis meta load:');
              console.log(result);
            });
        } else {
          this.github.gitdata.getBlob({
            sha: data.sha,
            owner: 'bingomanatee',
            repo: 'wonderland_labs_content',
            page: 1
          })
            .then((result) => {
              let metaData;
              let content = Buffer.from(result.content, 'base64');
              try {
                metaData = JSON.parse(content);
                _.extend(this, metaData);
              } catch (err) {
                console.log(`error parsing metadata for ${data.sha} (${content})`);
              }
              if (metaData) {
                return Promise.all(_(metaData)
                  .keys()
                  .map((key) => this.redisClient.hset(this.redisMetaPath, key, (() => {
                    let value = metaData[key];
                    if (_.isNull(value)) {
                        return '';
                    }
                    if (_.isArray(value)) {
                      return value.join("\t");
                    }
                    if (_.isObject(value)) {
                      return JSON.stringify(value);
                    }
                    return value;
                  })()))
                  .value());
              }
            })
            .catch((err) => {
              console.log(`error getting metadata for ${this.path}: `, require('util').inspect(err));
            });
        }
      });
  }

  toJSON() {
    return _.pick(this, 'path,title,intro,revised,on_homepage,hide,sha'.split(','));
  }

  jsonWithContent() {
    this.content()
      .then((content) => {
        return Object.assign(this.toJSON(), {content});
      });
  }

  get data() {
    return this._data;
  }

  set data(value) {
    this._data = value;
  }

  get sha() {
    return this._sha;
  }

  set sha(value) {
    this._sha = value;
  }

  get path() {
    return this._path;
  }

  set path(value) {
    this._path = value;
  }

  get title() {
    return this._title;
  }

  set title(value) {
    this._title = value;
  }

  get revised() {
    return this._revised;
  }

  set revised(value) {
    this._revised = value;
  }

  get on_homepage() {
    return this._on_homepage;
  }

  set on_homepage(value) {
    this._on_homepage = value;
  }

  get hide() {
    return this._hide;
  }

  set hide(value) {
    this._hide = value;
  }

  get intro() {
    return this._intro;
  }

  set intro(value) {
    this._intro = value;
  }

  content() {
    return this.contentLoaded()
      .then((exists) => {
        if (exists) {
          return this.redisClient.get(this.redisPath);
        } else {
          return this.load()
            .then(() => {
              return this.redisClient.get(this.redisPath);
            })
        }
      });
  }
}
