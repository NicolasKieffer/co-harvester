/*
 * @prettier
 */

"use strict";

const fetch = require("node-fetch"),
  fs = require("fs"),
  url = require("url"),
  program = require("commander"),
  colors = require("colors/safe");

const Conditor = require("./lib/conditor.js"),
  Crossref = require("./lib/crossref.js"),
  Pubmed = require("./lib/pubmed.js"),
  Hal = require("./lib/hal.js"),
  utils = require("./lib/utils.js");

const defaultConfig = {
  conditor: require("./conf/conditor.json"),
  crossref: require("./conf/crossref.json"),
  pubmed: require("./conf/pubmed.json"),
  hal: require("./conf/hal.json")
};

program
  .requiredOption(
    "--source <source>",
    colors.yellow(colors.bold("required")) + "  targetted source (hal|conditor|crossref|pubmed)"
  )
  .option("--query <query>", colors.yellow(colors.bold("required")) + "   API query")
  .option("--ids <ids>", colors.gray(colors.bold("optionnal")) + "  path of file containing ids (one id by line)")
  .option("--conf <conf>", colors.gray(colors.bold("optionnal")) + "  conf path")
  .option("--limit <limit>", colors.gray(colors.bold("optionnal")) + "  number of file(s) downloaded simultaneously")
  .option("--quiet", colors.gray(colors.bold("optionnal")) + "  quiet mode")
  .on("--help", function() {
    console.log("");
    console.log(colors.green(colors.bold("Usages exemples: https://github.com/conditor-project/co-harvester")));
    console.log("");
    console.log(
      colors.green(
        colors.bold(
          "More infos about [CONDITOR API] here: https://github.com/conditor-project/api/blob/master/doc/records.md" +
            "\n" +
            "More infos about [CROSSREF API] here: https://github.com/CrossRef/rest-api-doc" +
            "\n" +
            "More infos about [HAL API] here: http://api.archives-ouvertes.fr/docs" +
            "\n" +
            "More infos about [PUBMED API] here: https://www.ncbi.nlm.nih.gov/books/NBK25501/"
        )
      )
    );
    console.log("");
  })
  .parse(process.argv);

let query = typeof program.query !== "undefined" ? program.query : undefined,
  source = typeof program.source !== "undefined" ? program.source : undefined,
  ids = typeof program.ids !== "undefined" ? fs.readFileSync(program.ids, "utf8").split("\n") : undefined,
  conf = typeof program.conf !== "undefined" ? JSON.parse(fs.readFileSync(program.conf)) : {},
  opts = typeof program.limit !== "undefined" ? { limit: program.limit } : undefined,
  harvester,
  data,
  method,
  callback;

if (source !== "hal" && source !== "conditor" && source !== "crossref" && source !== "pubmed") {
  console.log("available values of --source parameter : hal|conditor|crossref|pubmed");
  process.exit();
} else conf = Object.assign({}, defaultConfig[source], conf);

if (typeof query !== "undefined" && typeof ids === "undefined") {
  if (source === "conditor" || source === "hal") {
    data = query;
    conf.output = conf.output + ".json";
    method = "requestByQuery";
    callback = function(err, res) {
      if (typeof res !== "undefined") console.log(res);
      if (err) process.exit();
    };
  } else if (source === "pubmed") {
    data = query;
    conf.output = conf.output + ".gz";
    method = "requestByQuery";
    callback = function(err, res) {
      if (typeof res !== "undefined") console.log(res);
      if (err) process.exit();
    };
  } else {
    console.log("Not available yet for this source.");
    process.exit();
  }
} else if (typeof query === "undefined" && typeof ids !== "undefined") {
  if (source === "conditor" || "crossref") {
    data = ids;
    conf.output = conf.output + ".gz";
    method = "requestByIds";
    callback = function(err, res) {
      if (typeof res !== "undefined") console.log(res);
      if (err) process.exit();
    };
  } else {
    console.log("Not available yet for this source.");
    process.exit();
  }
} else {
  console.log("invalid parameters : you must use '--query' OR '--ids' parameter");
  console.log("available :");
  console.log("node index.js --query=myQuery");
  console.log("or");
  console.log("node index.js --ids=/path/to/my/ids.txt # file containing one id by line");
  process.exit();
}

if (source === "hal") {
  harvester = new Hal(conf);
} else if (source === "conditor") {
  harvester = new Conditor(conf);
} else if (source === "crossref") {
  harvester = new Crossref(conf);
} else if (source === "pubmed") {
  harvester = new Pubmed(conf);
}

harvester[method](data, callback, opts);
