const githubCommandsExecuted = [];
const tree = require('./fixtures/articles.json');
const fs = require('fs');

function logGithub(msg) {
  // console.log('github:: ', msg);
  githubCommandsExecuted.push(msg);
}

const mockGithub = {
  gitdata: {
    getTree: (data) => {
      logGithub(`getTree(${JSON.stringify(data)})`);
      return new Promise((resolve) => {
        resolve({tree: tree});
      });
    },
    getBlob: (data) => {
      let sha = data.sha;
      logGithub(`getBlob(${sha})`)
      return new Promise((resolve, reject) => {
        let shaPath = `fixtures/blobs/${sha}.txt`;
        if (fs.existsSync(shaPath)) {
          fs.readFile(shaPath, (err, content) => {
            resolve({
              content: content.toString('base64')
            });
          });
        } else {
          logGithub(`... error sha not found: ${sha}`);
          return reject(`cannot find sha ${sha}`);
        }
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


module.exports = mockGithub;