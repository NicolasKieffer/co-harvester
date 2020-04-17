/*
 * @prettier
 */

"use strict";

const utils = require("./utils.js"),
  fetch = require("node-fetch"),
  colors = require("colors"),
  async = require("async"),
  url = require("url");

let Crossref = function(conf) {
  let config = Object.assign({}, { output: null, usr: null, pwd: null, pattern: null }, conf);
  this.output = config.output;
  this.pattern = config.pattern;
  utils.init(this.output);
  return this;
};

Crossref.prototype.requestByIds = function(ids, cb, opts) {
  let self = this,
    options = Object.assign({}, { limit: 1 }, opts),
    c = 0;

  utils.progress.init(c, ids.length);
  async.eachLimit(
    ids,
    options.limit,
    function(id, callback) {
      self.requestById(id, function(err) {
        utils.progress.update(++c);
        return callback(err);
      });
    },
    function(err) {
      utils.progress.stop();
      utils.zip.end();
      utils.logs.end();
      if (err) console.log(colors.red(err));
      return cb(err);
    }
  );
};

Crossref.prototype.requestById = function(id, cb) {
  fetch(this.getIdUrl(id), {
    headers: { "Content-Type": "application/xml" }
  })
    .then(utils.http.checkStatus)
    .then(res => res.buffer())
    .then(function(res) {
      return utils.zip.append(res, id + ".xml", function(err) {
        return cb(err);
      });
    })
    .catch(function(err) {
      if (err.name === "httpStatusException") {
        utils.logs.append(err);
        return cb();
      } else return cb(err);
    });
};

Crossref.prototype.requestByQuery = function(query, cb) {
  throw new Error("Not implemented yet.");
};

Crossref.prototype.scroll = function(scrollId, previousCount = 0, cb) {};

Crossref.prototype.getScrollUrl = function(id) {};

Crossref.prototype.getIdUrl = function(id) {
  return this.pattern.replace(":id", id) + this.getIdUrlParams();
};

Crossref.prototype.getIdUrlParams = function() {
  return this.usr && this.pwd ? "?usr=" + this.usr + "&" + "pwd=" + this.pwd : "";
};

module.exports = Crossref;
