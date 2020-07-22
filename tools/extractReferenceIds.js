/*
 * @prettier
 */

"use strict";

const fs = require("fs"),
  StreamArray = require("stream-json/streamers/StreamArray"),
  _ = require("lodash"),
  program = require("commander"),
  colors = require("colors/safe");

program
  .requiredOption("--input <input>", colors.yellow(colors.bold("required")) + "  input file (json)")
  .requiredOption("--output <output>", colors.yellow(colors.bold("required")) + "  output file (txt)")
  .parse(process.argv);

let ids = {};

try {
  fs.unlinkSync(program.output);
} catch (err) {
  // handle the error
  if (err.errno !== -2) {
    console.log(err);
    process.exit();
  }
}

const jsonStream = StreamArray.withParser(),
  outStream = fs.createWriteStream(program.output, { flags: "a" });

jsonStream.on("data", ({ key, value }) => {
  let idChain = _.get(value, "idChain", false),
    idConditor = _.get(value, "idConditor", false);
  if (idConditor && !ids[idChain]) {
    ids[idChain] = true;
    outStream.write(idConditor + "\n");
  }
});

fs.createReadStream(program.input).pipe(jsonStream.input);
