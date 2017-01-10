'use strict';

const Articles = require('./ArticlesModel');

module.exports = (github, redis, prefix) => new Articles(github ,redis, prefix || 'wonderWorld');
