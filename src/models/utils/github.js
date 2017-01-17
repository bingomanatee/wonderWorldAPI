
const GithubApi = require('github');

var github = new GithubApi({
  debug: true,
  headers: {
    "user-agent": "Wonderland-labs" // GitHub is happy with a unique user agent
  },
  Promise,
  followRedirects: false,
  host: 'api.github.com',
  protocol: 'https'
});
const GITHUB_TOKEN = process.env.WW_GITHUB_TOKEN;
console.log('GITHUB GITHUB_TOKEN:', GITHUB_TOKEN);
github.authenticate({
  type: "token",
  token: GITHUB_TOKEN,
});

module.exports = github;