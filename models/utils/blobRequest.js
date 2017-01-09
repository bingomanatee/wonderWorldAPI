module.exports = (github, sha, page) => {
  let request = {
    sha: sha,
    owner: 'bingomanatee',
    repo: 'wonderland_labs_content',
    page: page || 1
  };

  return github.gitdata.getBlob(request)
    .then((result) => Buffer.from(result.content, 'base64').toString());
}