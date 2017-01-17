module.exports = (github) => github.repos.getCommits({
  owner: 'bingomanatee',
  repo: 'wonderland_labs_content',
  per_page: 3
})
  .then((response) => {
    return response[0].sha;
  });