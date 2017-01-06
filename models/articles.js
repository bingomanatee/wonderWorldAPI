'use strict';

const Articles = require('./ArticlesModel');

module.exports = (github, redisClient) => return new Articles(github ,redisClient);
