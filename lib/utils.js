/*
 * @prettier
 */

"use strict";

const cliProgress = require("cli-progress"),
  archiver = require("archiver"),
  path = require("path"),
  fs = require("fs");

let utils = {},
  progress = {},
  outStream,
  logStream,
  archive;

// create a new progress bar instance and use shades_classic theme
const multibar = new cliProgress.MultiBar(
  {
    format: "{text} |{bar}| {percentage}% || {value}/{total} document(s)",
    barCompleteChar: "\u2588",
    barIncompleteChar: "\u2591",
    clearOnComplete: false,
    hideCursor: true
  },
  cliProgress.Presets.shades_classic
);

utils.init = function (conf, events) {
  try {
    fs.unlinkSync(conf.output);
    fs.unlinkSync(conf.output + ".log");
  } catch (err) {
    // handle the error
    if (err.errno !== -2) {
      console.log(err);
      process.exit();
    }
  }
  // create a file to stream archive data to.
  outStream = fs.createWriteStream(conf.output, { flags: "a" });
  logStream = fs.createWriteStream(conf.output + ".log", { flags: "a" });

  let _events = Object.assign(
    {},
    { close: function () {}, end: function () {}, warning: function () {}, error: function () {} },
    events
  );

  if (conf.archive === "zip") {
    archive = archiver("zip", {
      zlib: { level: 9 } // Sets the compression level.
    });
  } else if (conf.archive === "gz") {
    archive = archiver("tar", {
      gzip: true,
      gzipOptions: {
        level: 1
      }
    });
  }

  if (typeof conf.archive !== "undefined") {
    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on("warning", function () {
      if (typeof _events.close === "function") return _events.warning();
    });

    // good practice to catch this error explicitly
    archive.on("error", function () {
      if (typeof _events.close === "function") return _events.error();
    });

    archive.pipe(outStream);
  }

  // listen for all archive data to be written
  // 'close' event is fired only when a file descriptor is involved
  outStream.on("close", function () {
    if (typeof archive !== "undefined") console.log(archive.pointer() + " total bytes");
    if (typeof _events.close === "function") return _events.close();
  });

  // This event is fired when the data source is drained no matter what was the data source.
  // It is not part of this library but rather from the NodeJS Stream API.
  // @see: https://nodejs.org/api/stream.html#stream_event_end
  outStream.on("end", function () {
    if (typeof _events.close === "function") return _events.end();
  });
};

utils.http = {};

utils.http.checkStatus = function (res) {
  if (res.status >= 200 && res.status < 300) {
    return res;
  } else {
    let err = new Error("httpStatusException");
    err.name = "httpStatusException";
    err.status = res.status;
    err.url = res.url;
    err.msg = "API respond with status " + err.status + " on : " + err.url;
    err.res = res;
    throw err;
  }
};

utils.progress = {};

utils.progress.init = function (total) {
  console.log("Harvesting started...");
  progress.success = multibar.create(total, 0, { text: "Success" });
  progress.error = multibar.create(total, 0, { text: "Error  " });
  progress.total = multibar.create(total, 0, { text: "Total  " });
};

utils.progress.increment = function (count, error) {
  progress.total.increment(count);
  if (!error) utils.progress.success(count);
  else utils.progress.error(count);
};

utils.progress.success = function (count) {
  progress.success.increment(count);
};

utils.progress.error = function (count) {
  progress.error.increment(count);
};

utils.progress.stop = function () {
  multibar.stop();
  console.log("done.");
};

utils.logs = {};

utils.logs.append = function (data, cb) {
  let result = typeof data === "string" ? data : JSON.stringify(data);
  return logStream.write(result + "\n", (err) => {
    if (err) console.log(err);
    if (typeof cb !== "undefined") return cb(err);
  });
};

utils.logs.end = function () {
  logStream.end();
};

utils.JSON = {};

utils.JSON.append = function (data, opts, cb) {
  let options = Object.assign({}, { first: false, prefix: "[", last: false, sufix: "]" }, opts),
    json = JSON.stringify(data),
    result =
      (options.first ? options.prefix : "") + json.substring(1, json.length - 1) + (options.last ? options.sufix : ",");
  return outStream.write(result, (err) => {
    if (err) throw err;
    if (typeof cb !== "undefined") return cb();
  });
};

utils.JSON.end = function () {
  outStream.end();
};

utils.archive = {};

utils.archive.append = function (buffer, filePath, cb) {
  archive.append(buffer, { name: filePath.replace(new RegExp("/", "gm"), "_").replace(/\\/gm, "_") });
  if (typeof cb !== "undefined") return cb();
};

utils.archive.end = function () {
  archive.finalize();
};

module.exports = utils;
