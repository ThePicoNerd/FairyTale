const chalk = require("chalk");
const figlet = require("figlet");
const compiler = require("./lib/compiler");
const path = require("path");
const { argv } = require("yargs");
const fs = require("fs-extra");

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

  const { source, target } = argv;

  let js = compiler.compile({
    source: fs.readFileSync(path.join(process.cwd(), source), "utf8")
  });

  let output = path.join(process.cwd(), target);

  fs.mkdirpSync(path.dirname(output));

  fs.writeFileSync(output, js);
};

run();