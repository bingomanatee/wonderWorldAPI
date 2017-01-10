const tap = require('tap');
const ArticlesModel = require('./../models/ArticlesModel');
// const github = require('./../models/utils/github');
const getLastSha = require('./../models/utils/getLastSha');
const fs = require('fs');
const promiseRedisForMock = require('./promiseRedisForMock');
const redis = require('./../models/utils/redis');
const _ = require('lodash');
const mockGithub = require('./mockGithub');

tap.test('ArticlesModel.js', (suite) => {
  /* --------- fixture factories --------- */

// pulling blobs of article content
  if (false) suite.test('setting blobs', {skip: true}, (assert) => {
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

// creating a fixture for the articles.json
  if (false) suite.test('setting articles tree', {skip: true}, (assert) => {
    const mockRedis = {};
    let prefix = `test:setting articles tree::${new Date().getTime() + Math.random()}:`;
    const articles = new ArticlesModel(github, mockRedis, prefix);

    getLastSha(github)
      .then((sha) => {
        return articles.getIndexData(sha);
      })
      .then((data) => {
        fs.writeFile('fixtures/articles.json', JSON.stringify(data.tree), () => {
          articles.purge()
            .then(() => {
              assert.end();
            })
        });
      });
  });

  /* ---------- real tests ---------- */

  suite.test('load()', {skip: false}, (assert) => {
    let prefix = `test::load::${new Date().getTime() + Math.random()}:`;
    let articles = new ArticlesModel(mockGithub, redis, prefix);

    articles.load()
      .then(() => articles.getHomepages())
      .then((result) => {
        assert.same(_.sortBy(result), _.sortBy(require('./fixtures/homepageArticles.json')));
        return articles.getArticleList();
      })
      .then((result) => {
        assert.same(result, require('./fixtures/articleList.json'));
        return articles.getArticle('articles/client_side_state.md');
      })
      .then((article) => {
        assert.equal(article.title, 'The Client Side State Paradox');
        assert.end();
      });
  });

  suite.test('setHomepageIndex()', {skip: true}, (assert) => {
    let prefix = `test::setHomepageIndex::${new Date().getTime() + Math.random()}:`;
    let articles = new ArticlesModel({}, redis, prefix);

    articles.purgeHomepageIndex()
      .then(() => Promise.all([
        articles.setHomepageIndex('foo'),
        articles.setHomepageIndex('bar'),
        articles.setHomepageIndex('vey')
      ]))
      .then(() => articles.getHomepages())
      .then((result) => {
        console.log('result of getting home pages: ', result);
        assert.same(_.sortBy(result, _.identity), 'bar,foo,vey'.split(','));
        return articles.purge();
      })
      .then(() => {
        assert.end();
      })
  });

  if (false) suite.test('listArticle()', {skip: true}, (assert) => {
    let prefix = `test::listArticle::${new Date().getTime() + Math.random()}:`;
    let articles = new ArticlesModel({}, redis, prefix);

    articles.purgeArticleIndex()
      .then(() => Promise.all([
        articles.listArticle('foo', '123'),
        articles.listArticle('bar', '456'),
        articles.listArticle('vey', '789')
      ]))
      .then(() => articles.getArticleList())
      .then((result) => {
        assert.same(result, {foo: '123', bar: '456', vey: '789'});
        return articles.purge();
      })
      .then(() => {
        assert.end();
      });
  });


  suite.end();
}).then(() => {
  console.log('done with suite');
  // todo: purge tests
  redis.quit();
});
