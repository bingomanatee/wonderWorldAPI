'use strict';

let github = require('./utils/github');
const redis = require('./utils/redis');

const Articles = require('./ArticlesModel');
const PREFIX = 'live:';
const HOME_PAGE_CACHE_PATH = `${PREFIX}HOMEPAGE_CACHE`;

let articles = new Articles(github ,redis, PREFIX || 'wonderWorld');
redis.flushall()
  .then(() => articles.load());

module.exports = {
  HOME_PAGE_CACHE_PATH,
  articles
};
