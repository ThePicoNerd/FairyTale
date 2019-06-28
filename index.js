#!/usr/bin/env node

const chalk = require("chalk");
const figlet = require("figlet");
const compiler = require("./lib/compiler");
const path = require("path");
const argv = require("yargs")
  .usage("Usage: $0 -s [filepath] -o [filepath] [-r]")
  .demandOption(["s", "o"]).argv;
const fs = require("fs-extra");

const init = () => {
  console.log(
    chalk.magenta(
      figlet.textSync("FairyTale", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default"
      })
    )
  );
  console.log("\n");
};

// ...

const run = async () => {
  init();

  console.log(chalk.yellow("Translating your book to unicorn language ..."));

  let js = compiler.compile({
    source: fs.readFileSync(path.join(process.cwd(), argv.s), "utf8")
  });

  let output = path.join(process.cwd(), argv.o);

  fs.mkdirpSync(path.dirname(output));

  fs.writeFileSync(output, js);

  if (argv.r) {
    let exec = require("child_process").exec;

    console.log(chalk.yellow("Hold on tight while we read your book ..."));

    child = exec(`node ${output}`, (error, stdout, stderr) => {
      console.log(stdout);

      if (stderr) {
        console.log(
          `An error occurred when we were reading your finished book: ${stderr}`
        );
      }

      if (error !== null) {
        console.log(
          `There was an error trying to read your finished book: ${error}`
        );
      }
    });
  } else {
    console.log(
      chalk.green(
        `Your book has been sent to "${output}". Run the same command but with the option -r to read it.`
      )
    );
  }
};

run();
