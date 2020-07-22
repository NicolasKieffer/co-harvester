/*
 * @prettier
 */

"use strict";

const utils = require("./utils.js"),
  fetch = require("node-fetch"),
  colors = require("colors"),
  async = require("async"),
  xmlParser = require("fast-xml-parser"),
  XmlSplit = require("xmlsplit"),
  url = require("url"),
  Stream = require("stream");

let Pubmed = function (conf) {
  let config = Object.assign({}, { output: null, usr: null, pwd: null, pattern: null }, conf);
  this.output = config.output;
  this.pattern = config.pattern;
  this.httpErrorsCount = 0;
  this.hasProxy = typeof config.agent !== "undefined";
  this.agent = this.hasProxy ? config.agent : undefined;
  utils.init({ output: config.output, archive: config.archive });
  return this;
};

Pubmed.prototype.requestByIds = function (ids, cb, opts) {
  throw new Error("Not implemented yet.");
};

Pubmed.prototype.requestById = function (id, cb) {
  throw new Error("Not implemented yet.");
};

Pubmed.prototype.requestByQuery = function (query, cb, opts) {
  let self = this,
    options = Object.assign({}, { retry: 2 }, opts);
  this.retry = options.retry;
  this.url = new URL(query);
  return this.sendQuery(cb);
};

Pubmed.prototype.sendQuery = function (cb) {
  let self = this;
  return fetch(this.url.href, {
    headers: { "Content-Type": "application/json" },
    agent: this.hasProxy ? this.agent : null
  })
    .then(utils.http.checkStatus)
    .then((res) => res.json())
    .then(function (res) {
      const webenv = res.esearchresult.webenv,
        queryKey = res.esearchresult.querykey,
        retstart = res.esearchresult.retstart,
        retmax = res.esearchresult.retmax,
        count = res.esearchresult.count;
      utils.progress.init(0, count);
      return self.scroll({ webenv, queryKey, retstart, retmax, count }, cb);
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

Pubmed.prototype.scroll = function (opts, cb) {
  let self = this,
    target = this.getScrollUrl(opts);
  return fetch(target, {
    headers: { "Content-Type": "application/xml" },
    agent: this.hasProxy ? this.agent : null
  })
    .then(utils.http.checkStatus)
    .then((res) => res.text())
    .then(function (res) {
      const articleSetStream = new Stream.Readable({
          objectMode: true,
          read() {
            this.push(res);
            this.push(null);
          }
        }),
        xmlsplit = new XmlSplit(),
        chain = articleSetStream.pipe(xmlsplit);
      chain.on("data", (data) => {
        const xmlString = data.toString(),
          doc = xmlParser.parse(xmlString),
          pmId = doc.PubmedArticleSet.PubmedArticle.MedlineCitation.PMID,
          filename = `pubmed-${pmId}.xml`;
        utils.logs.append(filename);
        utils.archive.append(xmlString, filename);
      });
      chain.on("error", function () {
        utils.progress.stop();
        utils.archive.end();
        utils.logs.end();
        console.log(colors.red("Error while writing XML files."));
        return cb(true);
      });
      chain.on("end", function () {
        opts.retstart = parseInt(opts.retstart) + parseInt(opts.retmax);
        let finished = parseInt(opts.retstart) >= parseInt(opts.count);
        if (!finished) {
          self.httpErrorsCount = 0;
          utils.progress.update(opts.retstart);
          return self.scroll(opts, cb);
        } else {
          utils.progress.update(opts.count);
          utils.progress.stop();
          utils.archive.end();
          utils.logs.end();
          return cb(false);
        }
      });
    })
    .catch(function (err) {
      utils.logs.append(err);
      if (err.name === "httpStatusException") {
        self.httpErrorsCount += 1;
        if (self.retry > self.httpErrorsCount) return self.scroll(opts, cb);
        else if (err.status === 404) return cb();
      }
      utils.progress.stop();
      console.log(colors.red(err));
      return cb(err);
    });
};

Pubmed.prototype.getScrollUrl = function (opts) {
  const webenv = opts.webenv,
    queryKey = opts.queryKey,
    retstart = opts.retstart,
    retmax = opts.retmax,
    result =
      this.url.href.split("/esearch.fcgi")[0] +
      "/efetch.fcgi" +
      "?db=pubmed&WebEnv=" +
      webenv +
      "&query_key=" +
      queryKey +
      "&retstart=" +
      retstart +
      "&retmax=" +
      retmax +
      "&retmode=xml";
  return result;
};

Pubmed.prototype.getIdUrl = function (id) {
  throw new Error("Not implemented yet.");
};

Pubmed.prototype.getIdUrlParams = function () {
  throw new Error("Not implemented yet.");
};

module.exports = Pubmed;
