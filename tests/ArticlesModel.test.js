const tap = require('tap');
const ArticlesModel = require('./../models/ArticlesModel');
// const github = require('./../models/utils/github');
const getLastSha = require('./../models/utils/getLastSha');
const fs = require('fs');
const promiseRedisForMock = require('./promiseRedisForMock');
const redis = require('./../models/utils/redisClient');

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
  // pulling blobs of article content
  tap.test('blobs.js', (assert) => {
    const mockRedis = {};
    const articles = require('./fixtures/articles.json');

    Promise.all(articles.map((article) => {
      new Promise((resolve) => {
        if (!article.type === 'blob') {
          return resolve();
        }

        github.gitdata.getBlob({
          sha: article.sha,
          owner: 'bingomanatee',
          repo: 'wonderland_labs_content',
          page: 1
        }).then((result) => {
          let content = Buffer.from(result.content, 'base64').toString();
          fs.writeFile(`fixtures/blobs/${article.sha}.txt`, content, resolve);
        })
      })
    })).then(() => assert.end());
  });
}

if (true) {
  tap.test('ArticlesModel.js', (assert) => {
    const githubCommandsExecuted = [];

    function logGithub(msg) {
      console.log('github:: ', msg);
      githubCommandsExecuted.push(msg);
    }

    const mockGithub = {
      gitdata: {
        getTree: (data) => {
          logGithub(`getTree(${JSON.stringify(data)})`);
          return new Promise((resolve) => {
            resolve({tree: require('./fixtures/articles.json')});
          });
        },
        getBlob: (data) => {
          let sha = data.sha;
          logGithub(`getBlob(${sha})`)
          return new Promise((resolve, reject) => {
            let shaPath = `fixtures/blobs/${sha}.txt`;
            if (!fs.existsSync(shaPath)) {
              logGithub(`... error sha not found: ${sha}`);
              return reject(`cannot find sha ${sha}`);
            }
            fs.readFile(shaPath, (err, content) => {
              resolve({
                content: content.toString('base64')
              });
            });
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

    let prefix = 'test:' + Math.random() + ':';
    let articles = new ArticlesModel(mockGithub, redis, prefix);

    articles.load()
      .then(() => {
        console.log('github commands: ', githubCommandsExecuted);
        articles.redisClient.get(prefix + 'homepage-articles')
          .then((result) => {
            console.log('========= homepage articles: ', result);
            assert.end();
          })
      })
  });
}