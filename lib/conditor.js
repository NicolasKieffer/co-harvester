/*
 * @prettier
 */

"use strict";

const utils = require("./utils.js"),
  fetch = require("node-fetch"),
  colors = require("colors"),
  async = require("async"),
  url = require("url");

let Conditor = function (conf) {
  let config = Object.assign({}, { output: null, access_token: null, pattern: null, fileExtension: null }, conf);
  this.fileExtension = config.fileExtension;
  this.headers = conf.headers;
  this.output = config.output;
  this.reference = config.reference;
  this.access_token = config.access_token;
  this.pattern = config.pattern;
  this.httpErrorsCount = 0;
  this.hasProxy = typeof config.agent !== "undefined";
  this.agent = this.hasProxy ? config.agent : undefined;
  utils.init({ output: config.output, archive: config.archive });
  return this;
};

Conditor.prototype.requestByIds = function (ids, cb, opts) {
  let self = this,
    options = Object.assign({}, { limit: 1, retry: 2 }, opts);
  this.retry = options.retry;
  utils.progress.init(ids.length);
  async.eachLimit(
    ids,
    options.limit,
    function (id, callback) {
      return self.requestById(id, function (err) {
        self.httpErrorsCount = 0;
        utils.progress.increment(1, err);
        return callback();
      });
    },
    function (err) {
      // retry failed
      utils.progress.stop();
      utils.archive.end();
      utils.logs.end();
      return cb();
    }
  );
};

Conditor.prototype.requestById = function (id, cb) {
  let self = this;
  return fetch(this.getIdUrl(id), {
    headers: this.headers,
    agent: this.hasProxy ? this.agent : null
  })
    .then(utils.http.checkStatus)
    .then((res) => res.buffer())
    .then(function (res) {
      return utils.archive.append(res, id + self.fileExtension, function (err) {
        return cb(err);
      });
    })
    .catch(function (err) {
      utils.logs.append(err);
      if (err.name === "httpStatusException") {
        self.httpErrorsCount += 1;
        if (self.retry > self.httpErrorsCount) return self.requestById(id, cb);
      }
      return cb(err);
    });
};

Conditor.prototype.requestByQuery = function (query, cb, opts) {
  let self = this,
    options = Object.assign({}, { retry: 2 }, opts);
  this.retry = options.retry;
  this.url = new URL(query);
  if (this.reference) {
    this.query = query;
    this.url.searchParams.set("includes", "idConditor,idChain");
    this.url.searchParams.delete("excludes");
  }
  this.access_token = this.url.searchParams.get("access_token") || this.access_token;
  this.hasScroll = this.url.searchParams.get("scroll") !== null;
  return this.sendQuery(cb);
};

Conditor.prototype.sendQuery = function (cb) {
  let self = this;
  return fetch(this.url.href, {
    headers: { "Content-Type": "application/json" },
    agent: this.hasProxy ? this.agent : null
  })
    .then(utils.http.checkStatus)
    .then(function (res) {
      let scrollId = res.headers.get("scroll-id"),
        count = parseInt(res.headers.get("x-result-count")),
        total = parseInt(res.headers.get("x-total-count"));
      return res.json().then(function (data) {
        if (self.hasScroll) {
          utils.progress.init(total);
          utils.progress.increment(count);
          let finished = count >= total;
          return utils.JSON.append(data, { first: true, last: finished }, function () {
            if (!finished) return self.scroll(scrollId, count, cb);
            else {
              utils.progress.stop();
              utils.JSON.end();
              utils.logs.end();
              return cb(false);
            }
          });
        } else return cb(false, data);
      });
    })
    .catch(function (err) {
      utils.logs.append(err);
      if (err.name === "httpStatusException") {
        self.httpErrorsCount += 1;
        if (self.retry > self.httpErrorsCount) return self.sendQuery(cb);
      }
      return cb(err);
    });
};

Conditor.prototype.scroll = function (scrollId, previousCount = 0, cb) {
  let self = this,
    target = this.getScrollUrl(scrollId);
  return fetch(target, {
    headers: { "Content-Type": "application/json" },
    agent: this.hasProxy ? this.agent : null
  })
    .then(utils.http.checkStatus)
    .then(function (res) {
      let id = res.headers.get("scroll-id"),
        chunk = parseInt(res.headers.get("x-result-count")),
        count = previousCount + chunk,
        total = parseInt(res.headers.get("x-total-count"));
      self.httpErrorsCount = 0;
      utils.progress.increment(chunk);
      return res.json().then(function (data) {
        let finished = count >= total;
        return utils.JSON.append(data, { last: finished }, function () {
          if (!finished) return self.scroll(id, count, cb);
          else {
            utils.progress.stop();
            utils.JSON.end();
            utils.logs.end();
            return cb(false);
          }
        });
      });
    })
    .catch(function (err) {
      utils.logs.append(err);
      if (err.name === "httpStatusException") {
        self.httpErrorsCount += 1;
        if (self.retry > self.httpErrorsCount) return self.scroll(scrollId, previousCount, cb);
      }
      return cb(err);
    });
};

Conditor.prototype.getScrollUrl = function (id) {
  return url.resolve(this.url.href.split("records")[0], "scroll/" + id) + "?access_token=" + this.access_token;
};

Conditor.prototype.getIdUrl = function (id) {
  return encodeURI(this.pattern.replace(":id", id) + "?access_token=" + this.access_token);
};

module.exports = Conditor;
