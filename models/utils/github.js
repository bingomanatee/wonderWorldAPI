
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
const TOKEN = process.env.GITHUB_TOKEN;
console.log('TOKEN:', TOKEN);
github.authenticate({
  type: "token",
  token: TOKEN,
});

module.exports = github;