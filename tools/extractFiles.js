/*
 * @prettier
 */

const fs = require("fs"),
  archiver = require("archiver"),
  StreamArray = require("stream-json/streamers/StreamArray"),
  _ = require("lodash"),
  program = require("commander"),
  colors = require("colors/safe");

program
  .requiredOption("--input <input>", colors.yellow(colors.bold("required")) + "  input file")
  .requiredOption("--output <output>", colors.yellow(colors.bold("required")) + "  output file")
  .requiredOption("--data <data>", colors.yellow(colors.bold("required")) + "  data selector (path in JSON object)")
  .requiredOption(
    "--format <format>",
    colors.yellow(colors.bold("required")) + "  output files extension (.xml, .tei, .txt, etc)"
  )
  .requiredOption("--archive <archive>", colors.yellow(colors.bold("required")) + "  archive format (.zip or .gz)")
  .requiredOption("--id <id>", colors.yellow(colors.bold("required")) + "  id selector (path in JSON object)")
  .parse(process.argv);

try {
  fs.unlinkSync(program.output);
} catch (err) {
  // handle the error
  if (err.errno !== -2) {
    console.log(err);
    process.exit();
  }
}

let archive;

if (program.archive !== "zip" && program.archive !== "gz") {
  console.log("available values of --archive parameter : zip|gz");
  process.exit();
} else {
  if (program.archive !== "zip")
    archive = archiver("zip", {
      zlib: { level: 9 } // Sets the compression level.
    });
  else if (program.archive !== "gz")
    archive = archiver("tar", {
      gzip: true,
      gzipOptions: {
        level: 1
      }
    });
}

const jsonStream = StreamArray.withParser(),
  outStream = fs.createWriteStream(program.output, { flags: "a" });

outStream.on("close", function () {
  console.log(archive.pointer() + " total bytes");
});

jsonStream.on("data", ({ key, value }) => {
  let data = _.get(value, program.data, ""),
    id = program.id ? _.get(value, program.id, key) : key;
  archive.append(Buffer.from(data.toString(), "utf8"), { name: id + program.format });
});

jsonStream.on("end", () => {
  archive.finalize();
  console.log("done.");
});

archive.pipe(outStream);

fs.createReadStream(program.input).pipe(jsonStream.input);
