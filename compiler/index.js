const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const shell = require("shelljs");
const compiler = require("./lib/compiler");
const path = require("path");
const yargs = require("yargs");
const {argv} = require("yargs");

const init = () => {
  console.log(
    chalk.blue(
      figlet.textSync("FairyTale", {
        font: "Standard",
        horizontalLayout: "default",
        verticalLayout: "default"
      })
    )
  );
}

// ...

const run = async () => {
  init();

  const { source, filename, author } = argv;

  compiler.compile({
    source: path.join(process.cwd(), source),
    target: path.join(process.cwd(), filename),
    author
  });
};

run();