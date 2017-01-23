/**
 * unlike blobRequest, this returns the raw buffer extracted from the blob data.
 * @param github {github} a github-api client
 * @param sha {String}
 * @param page {number} default = 1; the page of large data chunks
 * @returns {Promise.<TResult>}
 */

module.exports = (github, sha, page) => {
  let request = {
    sha: sha,
    owner: 'bingomanatee',
    repo: 'wonderland_labs_content',
    page: page || 1
  };

  return github.gitdata.getBlob(request)
    .then((result) => Buffer.from(result.content, 'base64'));
}