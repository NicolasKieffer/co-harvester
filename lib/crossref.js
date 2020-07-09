/*
 * @prettier
 */

"use strict";

const utils = require("./utils.js"),
  fetch = require("node-fetch"),
  colors = require("colors"),
  async = require("async"),
  url = require("url");

let Crossref = function (conf) {
  let config = Object.assign({}, { output: null, usr: null, pwd: null, pattern: null }, conf);
  this.output = config.output;
  this.pattern = config.pattern;
  this.httpErrorsCount = 0;
  this.hasProxy = typeof config.agent !== "undefined";
  this.hasUserAgent = !!config.userAgent;
  this.agent = this.hasProxy ? config.agent : undefined;
  this.userAgent = this.hasUserAgent ? config.userAgent : undefined;
  utils.init({ output: config.output, extension: config.extension });
  return this;
};

Crossref.prototype.requestByIds = function (ids, cb, opts) {
  let self = this,
    options = Object.assign({}, { limit: 1, retry: 2 }, opts),
    c = 0;
  this.retry = options.retry;
  utils.progress.init(c, ids.length);
  return async.eachLimit(
    ids,
    options.limit,
    function (id, callback) {
      return self.requestById(id, function (err) {
        if (!err) {
          self.httpErrorsCount = 0;
          utils.progress.update(++c);
        }
        return callback(err);
      });
    },
    function (err) {
      // retry failed
      utils.progress.stop();
      utils.archive.end();
      utils.logs.end();
      if (err) console.log(colors.red(err));
      return cb(err);
    }
  );
};

Crossref.prototype.requestById = function (id, cb) {
  let self = this,
    headers = { "Content-Type": "application/xml" };
  if (this.hasUserAgent) headers["User-Agent"] = this.userAgent;
  return fetch(this.getIdUrl(id), {
    headers: headers,
    agent: this.hasProxy ? this.agent : null
  })
    .then(utils.http.checkStatus)
    .then((res) => res.buffer())
    .then(function (res) {
      return utils.archive.append(res, id + ".xml", function (err) {
        return cb(err);
      });
    })
    .catch(function (err) {
      console.log(self.retry, self.httpErrorsCount, self.retry > self.httpErrorsCount);
      utils.logs.append(err);
      if (err.name === "httpStatusException") {
        self.httpErrorsCount += 1;
        if (self.retry > self.httpErrorsCount) return self.requestById(id, cb);
        else if (err.status === 404) return cb();
      }
      return cb(err);
    });
};

Crossref.prototype.requestByQuery = function (query, cb) {
  throw new Error("Not implemented yet.");
};

Crossref.prototype.scroll = function (scrollId, previousCount = 0, cb) {
  throw new Error("Not implemented yet.");
};

Crossref.prototype.getScrollUrl = function (id) {
  throw new Error("Not implemented yet.");
};

Crossref.prototype.getIdUrl = function (id) {
  return this.pattern.replace(":id", id) + this.getIdUrlParams();
};

Crossref.prototype.getIdUrlParams = function () {
  return this.usr && this.pwd ? "?usr=" + this.usr + "&" + "pwd=" + this.pwd : "";
};

module.exports = Crossref;
