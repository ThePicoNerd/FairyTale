const inquirer = require("inquirer");
const chalk = require("chalk");
const figlet = require("figlet");
const shell = require("shelljs");
const compiler = require("./lib/compiler");

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

const askQuestions = () => {
  const questions = [
    {
      name: "source",
      type: "input",
      message: "Where is your book located?"
    },
    {
      name: "filename",
      type: "input",
      message: "What should the book be called?"
    },
    {
      name: "name",
      type: "input",
      message: "Who wrote this magnificent book?"
    }
  ];
  return inquirer.prompt(questions);
};

// ...

const run = async () => {
  init();

  const answers = await askQuestions();
  const { source, filename, author } = answers;

  compiler.compile({
    source,
    target: filename,
    author
  });
};

run();