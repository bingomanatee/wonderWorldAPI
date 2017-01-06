const tap = require('tap');
const ArticlesModel = require('./../models/ArticlesModel');
const github = require('./../models/utils/github');
const getLastSha = require('./../models/utils/getLastSha');
const fs = require('fs');


if (false) {
  // creating a fixture for the articles.json
  tap.test('ArticlesModel.js', (assert) => {
    const mockRedis = {};
    const articles = new ArticlesModel(github, mockRedis);

    getLastSha(github)
      .then((sha) => {
        return articles.getIndexData(sha);
      })
      .then((data) => {
        fs.writeFile('fixtures/articles.json', JSON.stringify(data.tree), () => {
          assert.end();
        });
      });
  });
}

if (false) {
  tap.test('ArticlesModel.js', (assert) => {
    const redisCommandsExecuted = [];
    const githubCommandsExecuted = [];

    function logGithub(msg) {
      console.log('github:: ', msg);
      githubCommandsExecuted.push(msg);
    }

    function logRedis(msg) {
      console.log('redis :: ', msg);
      redisCommandsExecuted.push(msg);
    }

    const mockRedis = {
      del: (key) => {
        logRedis(`del ${key}`);
        return new Promise((resolve) => resolve(1));
      },
      hset: (path, key, value) => {
        logRedis(`${path} [${key}] => ${value}`);
        return new Promise((resolve) => resolve(1));
      },
      get: (key) => {
        logRedis(`get ${key}`);
        return new Promise((resolve) => {
          resolve(foo);
        });
      }
    };

    const mockGithub = {
      gitdata: {
        getTree: (data) => {
          logGithub(`getTree(${JSON.stringify(data)})`);
          return new Promise((resolve) => {
            resolve({tree: require('./fixtures/articles.json')});
          });
        },
        getBlob: (sha) => {
          logGithub(`getBlob(${sha})`)
          return new Promise((resolve) => {

          });
        }
      },
      repos: {
        getCommits: (config) => {
          logGithub(`gitCommits(${JSON.stringify(config)})`);
          return new Promise((resolve) => resolve([
            {sha: 'abd123'}
          ]));
        }
      }
    };

    let articles = new ArticlesModel(mockGithub, mockRedis);

    articles.load()
      .then(() => {
        console.log('github commands: ', githubCommandsExecuted);
        console.log('redis commands: ', redisCommandsExecuted);
        assert.end();
      })
  });
}