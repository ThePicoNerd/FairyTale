const fs = require("fs-extra");

function compile({source, target, author}) {
  let input = fs.readFileSync(source, "utf8");
  let output = fs.createWriteStream(target);

  // Cleanup
  input = input.replace(/[ ](?=(?:(?:[^"]*"){2})*[^"]*$)/g, " ");
  let lines = input.split("\n");

  for (let lineNumber in lines) {
    let line = lines[lineNumber];

    output.write(line);

    console.log(line);
  }
}

exports.compile = compile;