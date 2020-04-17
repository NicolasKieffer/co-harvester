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

let Pubmed = function(conf) {
  let config = Object.assign({}, { output: null, usr: null, pwd: null, pattern: null }, conf);
  this.output = config.output;
  this.pattern = config.pattern;
  utils.init(this.output);
  return this;
};

Pubmed.prototype.requestByIds = function(ids, cb, opts) {};

Pubmed.prototype.requestById = function(id, cb) {};

Pubmed.prototype.requestByQuery = function(query, cb) {
  let self = this;

  this.url = new URL(query);

  fetch(this.url.href, {
    headers: { "Content-Type": "application/json" }
  })
    .then(utils.http.checkStatus)
    .then(res => res.json())
    .then(function(res) {
      const webenv = res.esearchresult.webenv,
        queryKey = res.esearchresult.querykey,
        retstart = res.esearchresult.retstart,
        retmax = res.esearchresult.retmax,
        count = res.esearchresult.count;
      utils.progress.init(0, count);
      self.scroll({ webenv, queryKey, retstart, retmax, count }, cb);
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

Pubmed.prototype.scroll = function(opts, cb) {
  let self = this,
    target = this.getScrollUrl(opts);
  fetch(target, {
    headers: { "Content-Type": "application/xml" }
  })
    .then(utils.http.checkStatus)
    .then(res => res.text())
    .then(function(res) {
      const articleSetStream = new Stream.Readable({
          objectMode: true,
          read() {
            this.push(res);
            this.push(null);
          }
        }),
        xmlsplit = new XmlSplit(),
        chain = articleSetStream.pipe(xmlsplit);
      chain.on("data", data => {
        const xmlString = data.toString(),
          doc = xmlParser.parse(xmlString),
          pmId = doc.PubmedArticleSet.PubmedArticle.MedlineCitation.PMID,
          filename = `pubmed-${pmId}.xml`;
        utils.logs.append(filename);
        utils.zip.append(xmlString, filename);
      });
      chain.on("error", function() {
        utils.progress.stop();
        utils.zip.end();
        utils.logs.end();
        console.log(colors.red("Error while writing XML files."));
        return cb(true);
      });
      chain.on("end", function() {
        opts.retstart = parseInt(opts.retstart) + parseInt(opts.retmax);
        let finished = parseInt(opts.retstart) >= parseInt(opts.count);
        if (!finished) {
          utils.progress.update(opts.retstart);
          return self.scroll(opts, cb);
        } else {
          utils.progress.update(opts.count);
          utils.progress.stop();
          utils.zip.end();
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

Pubmed.prototype.getScrollUrl = function(opts) {
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

Pubmed.prototype.getIdUrl = function(id) {};

Pubmed.prototype.getIdUrlParams = function() {};

module.exports = Pubmed;
