'use strict';
const _ = require('lodash');
const path = require('path');
const blobRequest = require('./utils/blobRequest');

function toString(value) {
  if (_.isNull(value) || _.isUndefined(value)) {
    value = '';
  }
  if (_.isArray(value)) {
    value = value.join("\t");
  }
  if (_.isObject(value)) {
    value = JSON.stringify(value);
  }
  if (_.isBoolean(value)) {
    value = value ? '1' : '0';
  }
  if (typeof value === 'number') {
    value = value.toString();
  }

  if (!(typeof value === 'string')) {
    value = `${value}`;
  }

  return value;
}

module.exports = class Article {

  constructor(github, redis, data) {
    this.path = data.path;
    this.sha = data.sha;
    this.prefix = data.prefix;
    this.data = data;
    this.hide = false;
    this.title = path.basename(this.path, '.md');
    this.intro = '';
    this.revised = '';
    this.github = github;
    this.redis = redis;
  }

  get prefix() {
    return this._prefix || '';
  }

  set prefix(value) {
    if (!value) {
      throw new Error('prefix must exist');
    }
    this._prefix = value;
  }

  get github() {
    return this._github;
  }

  set github(value) {
    this._github = value;
  }

  get redis() {
    return this._redis;
  }

  set redis(value) {
    if (!value) {
      throw new Error('Article: missing redis');
    }
    this._redis = value;
  }

  get on_folder_homepage() {
    return this._on_folder_homepage;
  }

  set on_folder_homepage(value) {
    this._on_folder_homepage = value;
  }

  contentLoaded() {
    return this.redis.exists(this.redisPath);
  }

  metaLoaded() {
    return this.redis.exists(this.redisMetaPath);
  }

  get redisPath() {
    return `${this.prefix}${this.path}`
  }

  loadContent() {
    console.log('content sha:', this.sha);
    return blobRequest(this.github, this.sha, 1)
      .then((content) => {
        console.log('content for ', this.path);
        console.log(content);
        this.redis.set(this.redisPath, content);
        return content;
      });
  }

  get redisMetaPath() {
    return `${this.redisPath}:meta`
  }

  get redisContentPath() {
    return `${this.redisPath}:content`;
  }

  readMetadata() {
    return this.redis.hgetall(this.redisMetaPath)
      .then((meta) => {
        if (!meta) {
          console.log('cannot get meta for ', this.redisMetaPath);
          return {};
        }
        // if(/client_side/.test(this.path)) console.log('metadata found for ', this.path, meta)
        for (let field of 'title,intro,revised,on_homepage,hide,revised,on_folder_homepage'.split(',')) {
          this[field] = meta[field];
        }
        this.on_homepage = !!parseInt(meta.on_homepage);
        this.hide = !!parseInt(meta.hide);

        this.on_folder_homepage = !!parseInt(meta.on_folder_homepage);
        if (this.on_folder_homepage) {
          this.on_homepage = false;
        }
        return meta;
      })
  }

  purgeMetadata() {
    return this.redis.del(this.redisMetaPath);
  }

  loadMetadata(data) {
    return this.metaLoaded()
      .then((loaded) => {
        if (loaded) {
          this.readMetadata()
            .then((result) => {
              console.log('result of redis meta load:', result);
            });
        } else {
          return blobRequest(this.github, data.sha, 1)
            .then((text) => {
              var metaData;
              try {
                metaData = JSON.parse(text);
                _.extend(this, metaData);
                let promises = [];

                for (let key in metaData) {
                  let value = toString(metaData[key]);
                  promises.push(this.redis.hset(this.redisMetaPath, key, value));
                }

                return Promise.all(promises);
              } catch (err) {
                console.log(`error parsing metadata for ${data.sha} (${text})`);
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
    return this.loadContent();
  }
}
