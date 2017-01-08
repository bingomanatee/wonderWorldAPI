const tap = require('tap');
const Article = require('./../models/Article');
// const github = require('./../models/utils/github');
// const getLastSha = require('./../models/utils/getLastSha');
const fs = require('fs');
const promiseRedisForMock = require('./promiseRedisForMock');
const redis = require('./../models/utils/redisClient');
const _ = require('lodash');

tap.test('Articles.js', (suite) => {
  suite.test('saving metadata', {skip: false}, (assert) => {
    let prefix = `test:${new Date().getTime() + Math.random()}:`;
    console.log('article test prefix: ', prefix);
    let meta = {
      title: 'Foo',
      intro: 'bar',
      on_homepage: true,
      hide: false
    }
    const mockGithub = {
      gitdata: {
        getBlob: (request) => {
          // @TODO: test input
          return new Promise((resolve) => {
              resolve(
                {
                  content: Buffer(JSON.stringify(meta)).toString('base64')
                }
              )
            }
          );
        }
      }
    };

    let article = new Article(mockGithub, redis, {path: 'foo/bar.md', sha: '123', prefix: prefix});

    article.loadMetadata({sha: '456'})
      .then((result) => {
        assert.same(article.toJSON(), {
          path: 'foo/bar.md',
          title: 'Foo',
          intro: 'bar',
          revised: '',
          on_homepage: true,
          hide: false,
          sha: '123'
        })
        assert.end();
      });
  });
  suite.end();
}).then(() => {
  console.log('done with suite');
  // todo: purge tests
  redis.quit();
});
