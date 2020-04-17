/*
 * @prettier
 */

"use strict";

const utils = require("./utils.js"),
  fetch = require("node-fetch"),
  colors = require("colors"),
  async = require("async"),
  url = require("url");

let Conditor = function(conf) {
  let config = Object.assign({}, { output: null, access_token: null, pattern: null }, conf);
  this.output = config.output;
  this.access_token = config.access_token;
  this.pattern = config.pattern;
  utils.init(this.output);
  return this;
};

Conditor.prototype.requestByIds = function(ids, cb, opts) {
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

Conditor.prototype.requestById = function(id, cb) {
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

Conditor.prototype.requestByQuery = function(query, cb) {
  let self = this;

  this.url = new URL(query);
  this.access_token = this.url.searchParams.get("access_token") || this.access_token;
  this.hasScroll = this.url.searchParams.get("scroll") !== null;

  fetch(this.url.href, {
    headers: { "Content-Type": "application/json" }
  })
    .then(utils.http.checkStatus)
    .then(function(res) {
      let scrollId = res.headers.get("scroll-id"),
        count = parseInt(res.headers.get("x-result-count")),
        total = parseInt(res.headers.get("x-total-count"));
      return res.json().then(function(data) {
        if (self.hasScroll) {
          utils.progress.init(count, total);
          let finished = count >= total;
          return utils.JSON.append(data, { first: true, last: finished }, function() {
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
    .catch(function(err) {
      utils.progress.stop();
      if (err.name === "httpStatusException") {
        console.log(colors.red(err.msg));
      } else console.log(colors.red(err));
      utils.logs.append(err);
      return cb(true);
    });
};

Conditor.prototype.scroll = function(scrollId, previousCount = 0, cb) {
  let self = this,
    target = this.getScrollUrl(scrollId);
  fetch(target, {
    headers: { "Content-Type": "application/json" }
  })
    .then(utils.http.checkStatus)
    .then(function(res) {
      let id = res.headers.get("scroll-id"),
        count = previousCount + parseInt(res.headers.get("x-result-count")),
        total = parseInt(res.headers.get("x-total-count"));
      utils.progress.update(count);
      return res.json().then(function(data) {
        let finished = count >= total;
        return utils.JSON.append(data, { last: finished }, function() {
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
    .catch(function(err) {
      utils.progress.stop();
      if (err.name === "httpStatusException") {
        console.log(colors.red(err.msg));
      } else console.log(colors.red(err));
      utils.logs.append(err);
      return cb(true);
    });
};

Conditor.prototype.getScrollUrl = function(id) {
  return url.resolve(this.url.href.split("records")[0], "scroll/" + id) + "?access_token=" + this.access_token;
};

Conditor.prototype.getIdUrl = function(id) {
  return this.pattern.replace(":id", id) + "?access_token=" + this.access_token;
};

module.exports = Conditor;
