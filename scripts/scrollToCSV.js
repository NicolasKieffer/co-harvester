/*
 * @prettier
 */

"use strict";

const fs = require("fs"),
  path = require("path"),
  colors = require("colors/safe"),
  program = require("commander");

program
  .requiredOption(
    "--input <input>",
    colors.yellow(colors.bold("required")) + "   must be JSON result of Conditor API query"
  )
  .requiredOption(
    "--fields <fields>",
    colors.yellow(colors.bold("required")) + "   all fields (separates by ',') you want to recover"
  )
  .option("--separator <separator>", colors.gray(colors.bold("optionnal")) + "  separator used in CSV file", "\t")
  .option("--output <output>", colors.gray(colors.bold("optionnal")) + "  output file path")
  .parse(process.argv);

const SEPARATOR = program.separator,
  INPUT = path.resolve(program.input),
  OUTPUT = program.output ? path.resolve(program.output) : undefined,
  HEADER = checkFields(program.fields) ? program.fields.split(",") : undefined;

if (typeof HEADER === "undefined") throw new Error(colors.red("invalid --fields. Check help to get more infos"));

fs.readFile(INPUT, "utf-8", function(err, res) {
  if (err) return console.log(err);
  let data = JSON.parse(res),
    result = getCSV(data);
  if (OUTPUT)
    return fs.writeFile(OUTPUT, result, "utf8", function(err) {
      if (err) throw err;
    });
  else console.log(result);
});

function getCSV(data) {
  return [HEADER.join(SEPARATOR), getCsvLines(data)].join("\n");
}

function getCsvLines(data) {
  let result = {},
    max = 1;
  // get all values in API result
  for (let i = 0; i < HEADER.length; i++) {
    let key = HEADER[i];
    result[key] = new Array(data.length);
    for (let j = 0; j < data.length; j++) {
      result[key][j] = getData(key, data[j]);
    }
  }
  return formatValues(result, data.length);
}

function formatValues(data, nbLines) {
  let result = [];
  for (let i = 0; i < nbLines; i++) {
    let maxLength = 1;
    for (let k in data) {
      if (Array.isArray(data[k][i]) && data[k][i].length > 0 && data[k][i].length > maxLength)
        maxLength = data[k][i].length;
    }
    let lines = new Array(maxLength);
    for (var j = 0; j < lines.length; j++) {
      let line = [];
      for (let k in data) {
        let value = data[k][i];
        if (Array.isArray(value)) line.push(value[j]);
        else if (typeof value === "string") line.push(value);
        else line.push("");
      }
      lines[j] = line.join(SEPARATOR);
    }
    result = result.concat(lines);
  }
  return result.join("\n");
}

function getData(key, source) {
  let i = key.indexOf(".");
  if (i < 0) return source[key];
  else {
    let sup = key.substring(0, i),
      sub = key.substring(i + 1),
      data = source[sup];
    if (Array.isArray(data)) {
      let res = [];
      for (let i = 0; i < data.length; i++) {
        res.push(getData(sub, data[i]));
      }
      return res;
    } else if (typeof data === "object" && sub.length > 0) return getData(sub, data);
    else return new Error("case not handled");
  }
}

function checkFields(fields) {
  if (typeof fields !== "string") return false;
  else return fields.match(/((\w+)+(.?\w+)+)(,((\w+)+(.?\w+)+))?/gm);
}
