/*
 * @prettier
 */

"use strict";

const fetch = require("node-fetch"),
  url = require("url"),
  fs = require("fs"),
  path = require("path"),
  cliProgress = require("cli-progress"),
  program = require("commander"),
  colors = require("colors/safe");

program
  .requiredOption(
    "--query <query>",
    colors.yellow(colors.bold("required")) + "   conditor query"
  )
  .option(
    "--token <token>",
    colors.gray(colors.bold("optionnal")) + "  authentication token"
  )
  .option("--scroll", colors.gray(colors.bold("optionnal")) + "  scroll mode")
  .option(
    "--criteria <criteria>",

    colors.gray(colors.bold("optionnal")) + "  property used to regroup results"
  )
  .option(
    "--format <object|array|list>",

    colors.gray(colors.bold("optionnal")) +
      "  format used to modify structure of API results"
  )
  .option(
    "--output <output>",
    colors.gray(colors.bold("optionnal")) + "  output file path",
    "./scroll.out"
  )
  .option("--quiet", colors.gray(colors.bold("optionnal")) + "  quiet mode")
  .on("--help", function() {
    console.log("");
    console.log(
      colors.green(
        colors.bold(
          "Usages exemples: https://github.com/conditor-project/co-harvester"
        )
      )
    );
    console.log("");
    console.log(
      colors.green(
        colors.bold(
          "More infos about [CONDITOR API] here: https://github.com/conditor-project/api/blob/master/doc/records.md"
        )
      )
    );
    console.log("");
  })
  .parse(process.argv);

// create a new progress bar instance and use shades_classic theme
const mainProgress = new cliProgress.SingleBar(
  {},
  cliProgress.Presets.shades_classic
);

let query = program.query,
  api = new URL(query),
  token = api.searchParams.get("access_token"),
  criteria = program.criteria,
  format = program.format,
  output = program.output,
  result = [],
  outputFormat = {
    object: function(data, criteria, stringify = true) {
      let result = {};
      for (var i = 0; i < data.length; i++) {
        if (typeof result[data[i][criteria]] === "undefined")
          result[data[i][criteria]] = [];
        result[data[i][criteria]].push(data[i]);
      }
      if (stringify) return JSON.stringify(result);
      else return result;
    },
    array: function(data, criteria, stringify = true) {
      let hits = outputFormat.object(data, criteria, false),
        result = [];
      for (let key in hits) {
        result.push(data[i]);
      }
      if (stringify) return JSON.stringify(result);
      else return result;
    },
    list: function(data, criteria, stringify = true) {
      let result = Object.keys(outputFormat.object(data, criteria, false));
      if (stringify) return result.join("\n");
      else return result;
    }
  };

if (typeof format !== "undefined" && typeof outputFormat[format] !== "function")
  throw new Error(
    colors.red(
      "invalid --format. Available values are: object OR array OR list"
    )
  );

// Token initialisation
if (!token) {
  log("Token not found in --query");
  if (program.token) {
    log("Token provided by --token");
    token = program.token;
  } else {
    log("Token not found in --token");
    if (process.env.CONDITOR_TOKEN) {
      log("Token provided by ENV $CONDITOR_TOKEN");
      token = process.env.CONDITOR_TOKEN;
    } else log("Token not found in ENV $CONDITOR_TOKEN");
  }
  api.searchParams.set("access_token", token);
}

function harvest(target) {
  log("Request API...");
  log(target);
  return fetch(target, {
    headers: { "Content-Type": "application/json" }
  })
    .then(checkStatus)
    .then(function(res) {
      log("done.");
      let scrollId = res.headers.get("scroll-id"),
        count = +res.headers.get("x-result-count"),
        total = +res.headers.get("x-total-count");
      return res.json().then(function(data) {
        if (!program.scroll) return console.log(data);
        else {
          log("Harvesting API...");
          if (!program.quiet) mainProgress.start(total, count);
          result = result.concat(data);
          return _scroll(scrollId, count).catch(function(err) {
            throw err;
          });
        }
      });
    });
}

function _scroll(scrollId, previousCount = 0) {
  let target = buildScrollUrl(scrollId);
  return fetch(target, {
    headers: { "Content-Type": "application/json" }
  })
    .then(checkStatus)
    .then(function(res) {
      let id = res.headers.get("scroll-id"),
        count = previousCount + +res.headers.get("x-result-count"),
        total = +res.headers.get("x-total-count");
      if (!program.quiet) mainProgress.update(count);
      return res.json().then(function(data) {
        result = result.concat(data);
        if (total > count) return _scroll(id, count);
        else {
          if (!program.quiet) mainProgress.stop();
          log("done.");
          let data = JSON.stringify(result);
          if (typeof outputFormat[format] === "function")
            data = outputFormat[format](result, criteria);
          return writeResult(output, data);
        }
      });
    });
}

function checkStatus(res) {
  if (res.status >= 200 && res.status < 300) {
    return res;
  } else {
    let err = new Error("httpStatusException");
    err.name = "httpStatusException";
    err.status = res.status;
    err.message = "API respond with status " + res.status;
    err.res = res;
    throw err;
  }
}

function writeResult(output, data, callback) {
  log("Wrinting data into : " + output + " ...");
  return fs.writeFile(output, data, "utf8", function(err) {
    if (err) throw err;
    log("done.");
    if (typeof callback === "function") return callback();
  });
}

function buildScrollUrl(scrollId) {
  let result =
    url.resolve(api.href.split("records")[0], "scroll/" + scrollId) +
    "?access_token=" +
    token;
  return result;
}

function log(str) {
  if (!program.quiet) console.log(str);
}

harvest(api.href).catch(function(err) {
  if (err.name === "httpStatusException") {
    console.log(colors.red(err.message));
  } else console.log(err);
  process.exit();
});
