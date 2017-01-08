const tap = require('tap');
const ArticlesModel = require('./../models/ArticlesModel');
// const github = require('./../models/utils/github');
const getLastSha = require('./../models/utils/getLastSha');
const fs = require('fs');
const promiseRedisForMock = require('./promiseRedisForMock');
const redis = require('./../models/utils/redisClient');
const _ = require('lodash');

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

tap.test('ArticlesModel.js', (suite) => {
  suite.test('setting homepage list', (assert) => {
    let prefix = `test:${new Date().getTime() + Math.random()}:`;
    let article = new ArticlesModel({}, redis, prefix);

    article.purgeHomepageIndex()
      .then(() => Promise.all([
        article.setHomepageIndex('foo'),
        article.setHomepageIndex('bar'),
        article.setHomepageIndex('vey')
      ]))
      .then(() => article.getHomepages())
      .then((result) => {
        console.log('result of getting home pages: ', result);
        assert.same(_.sortBy(result, _.identity), 'bar,foo,vey'.split(','));
        assert.end();
      });
  });
  suite.test('setting article index', (assert) => {
    let prefix = `test:${new Date().getTime() + Math.random()}:`;
    let article = new ArticlesModel({}, redis, prefix);

    article.purgeArticleIndex()
      .then(() => Promise.all([
        article.listArticle('foo', '123'),
        article.listArticle('bar', '456'),
        article.listArticle('vey', '789')
      ]))
      .then(() => article.getArticleList())
      .then((result) => {
        assert.same(result, {foo: '123', bar: '456', vey: '789'});
        assert.end();
      });
  });
  suite.test('Seeding Article', {skip: false}, (assert) => {
    const githubCommandsExecuted = [];

    function logGithub(msg) {
      // console.log('github:: ', msg);
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

    let prefix = `test:${new Date().getTime() + Math.random()}:`;
    let articles = new ArticlesModel(mockGithub, redis, prefix);

    articles.load()
      .then(() => articles.getHomepages())
      .then((result) => {
        assert.same(_.sortBy(result), _.sortBy(require('./fixtures/homepageArticles.json')));
        return articles.getArticleList();
      })
      .then((result) => {
        assert.same(result, require('./fixtures/articleList.json'))
        assert.end();
      });
  });
  suite.end();
}).then(() => {
  console.log('done with suite');
  // todo: purge tests
  redis.quit();
});
