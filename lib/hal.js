/*
 * @prettier
 */

"use strict";

const utils = require("./utils.js"),
  fetch = require("node-fetch"),
  colors = require("colors"),
  async = require("async"),
  querystring = require("querystring"),
  url = require("url");

let Hal = function(conf) {
  let config = Object.assign({}, { output: null, pattern: null }, conf);
  this.output = config.output;
  this.pattern = config.pattern;
  utils.init(this.output);
  return this;
};

Hal.prototype.requestByIds = function(ids, cb, opts) {};

Hal.prototype.requestById = function(id, cb) {};

Hal.prototype.requestByQuery = function(query, cb) {
  let self = this;
  this.url = new URL(query);
  fetch(this.url.href, {
    headers: { "Content-Type": "application/json" }
  })
    .then(utils.http.checkStatus)
    .then(res => res.json())
    .then(function(res) {
      let nextCursorMark = res.nextCursorMark,
        count = res.response.docs.length,
        start = parseInt(res.response.start),
        total = parseInt(res.response.numFound);
      utils.progress.init(count, total);
      let finished = count + start >= total;
      return utils.JSON.append(res.response.docs, { first: true, last: finished }, function() {
        if (!finished) return self.scroll(nextCursorMark, start + count, cb);
        else {
          utils.progress.stop();
          utils.JSON.end();
          utils.logs.end();
          return cb(false);
        }
      });
    })
    .catch(function(err) {
      utils.progress.stop();
      if (err.name === "httpStatusException") {
        console.log(colors.red(err.msg));
      } else console.log(colors.red(err));
      utils.logs.append(err);
      return cb(true);
    });
};

Hal.prototype.scroll = function(nextCursorMark, start, cb) {
  let self = this,
    target = this.getScrollUrl(start, nextCursorMark);
  fetch(target, {
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(function(res) {
      let nextCursorMark = res.nextCursorMark,
        count = res.response.docs.length,
        start = parseInt(res.response.start),
        total = parseInt(res.response.numFound);
      utils.progress.update(count + start);
      let finished = count + start >= total;
      return utils.JSON.append(res.response.docs, { first: false, last: finished }, function() {
        if (!finished) return self.scroll(nextCursorMark, start + count, cb);
        else {
          utils.progress.stop();
          utils.JSON.end();
          utils.logs.end();
          return cb(false);
        }
      });
    })
    .catch(function(err) {
      utils.progress.stop();
      if (err.name === "httpStatusException") {
        console.log(colors.red(err.msg));
      } else console.log(colors.red(err));
      utils.logs.append(err);
      return cb(true);
    });
};

Hal.prototype.getScrollUrl = function(start, nextCursorMark) {
  let href = this.url.href.split("?"),
    urlBase = href[0],
    params = querystring.parse(href[1]);
  delete params.cursorMark;
  params.nextCursorMark = nextCursorMark;
  params.start = start;
  return `${urlBase}/?${querystring.stringify(params)}`;
};

module.exports = Hal;
