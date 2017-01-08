'use strict';

const Articles = require('./ArticlesModel');

module.exports = (github, redisClient, prefix) => new Articles(github ,redisClient, prefix || 'wonderWorld');
