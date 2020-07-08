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

let Hal = function (conf) {
  let config = Object.assign({}, { output: null, pattern: null }, conf);
  this.output = config.output;
  this.pattern = config.pattern;
  this.httpErrorsCount = 0;
  this.hasProxy = typeof config.agent !== "undefined";
  this.agent = this.hasProxy ? config.agent : undefined;
  utils.init({ output: config.output, extension: config.extension });
  return this;
};

Hal.prototype.requestByIds = function (ids, cb, opts) {
  throw new Error("Not implemented yet.");
};

Hal.prototype.requestById = function (id, cb) {
  throw new Error("Not implemented yet.");
};

Hal.prototype.requestByQuery = function (query, cb, opts) {
  let self = this,
    options = Object.assign({}, { retry: 2 }, opts);
  this.retry = options.retry;
  this.url = new URL(query);
  return this.sendQuery(cb);
};

Hal.prototype.sendQuery = function (cb) {
  let self = this;
  return fetch(this.url.href, {
    headers: { "Content-Type": "application/json" },
    agent: this.hasProxy ? this.agent : null
  })
    .then(utils.http.checkStatus)
    .then((res) => res.json())
    .then(function (res) {
      let nextCursorMark = res.nextCursorMark,
        count = res.response.docs.length,
        start = parseInt(res.response.start),
        total = parseInt(res.response.numFound);
      utils.progress.init(count, total);
      let finished = count + start >= total;
      return utils.JSON.append(res.response.docs, { first: true, last: finished }, function () {
        if (!finished) return self.scroll(nextCursorMark, start + count, cb);
        else {
          utils.progress.stop();
          utils.JSON.end();
          utils.logs.end();
          return cb(false);
        }
      });
    })
    .catch(function (err) {
      utils.logs.append(err);
      if (err.name === "httpStatusException") {
        self.httpErrorsCount += 1;
        if (self.retry > self.httpErrorsCount) return self.sendQuery(cb);
        else if (err.status === 404) return cb();
      }
      utils.progress.stop();
      console.log(colors.red(err));
      return cb(err);
    });
};

Hal.prototype.scroll = function (nextCursorMark, start, cb) {
  let self = this,
    target = this.getScrollUrl(start, nextCursorMark);
  return fetch(target, {
    headers: { "Content-Type": "application/json" },
    agent: this.hasProxy ? this.agent : null
  })
    .then((res) => res.json())
    .then(function (res) {
      let nextCursorMark = res.nextCursorMark,
        count = res.response.docs.length,
        start = parseInt(res.response.start),
        total = parseInt(res.response.numFound);
      self.httpErrorsCount = 0;
      utils.progress.update(count + start);
      let finished = count + start >= total;
      return utils.JSON.append(res.response.docs, { first: false, last: finished }, function () {
        if (!finished) return self.scroll(nextCursorMark, start + count, cb);
        else {
          utils.progress.stop();
          utils.JSON.end();
          utils.logs.end();
          return cb(false);
        }
      });
    })
    .catch(function (err) {
      utils.logs.append(err);
      if (err.name === "httpStatusException") {
        self.httpErrorsCount += 1;
        if (self.retry > self.httpErrorsCount) return self.scroll(nextCursorMark, start, cb);
        else if (err.status === 404) return cb();
      }
      utils.progress.stop();
      console.log(colors.red(err));
      return cb(err);
    });
};

Hal.prototype.getScrollUrl = function (start, nextCursorMark) {
  let href = this.url.href.split("?"),
    urlBase = href[0],
    params = querystring.parse(href[1]);
  delete params.cursorMark;
  params.nextCursorMark = nextCursorMark;
  params.start = start;
  return `${urlBase}/?${querystring.stringify(params)}`;
};

module.exports = Hal;
