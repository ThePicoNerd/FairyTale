const fs = require("fs-extra");
const prettier = require("prettier");

const closingSentences = ["Oh, what could happen next?", "That's all."];

const datatypes = {
  boolean: "alive|dead",
  string: `"[^"]*"`,
  wholeNumber: `[0-9]`,
  number: `[0-9]+(\.[0-9]+)?`
}

const punctuation = [".", "!", ":"];
const punctuationRegExp = `(${punctuation.join("|")})`
const variable = "[A-Za-z]+";

const listItemRegExp = `(-|\\*)`

datatypes.any = `(${datatypes.number}|${datatypes.boolean}|${datatypes.string}|${datatypes.number}|${variable})`;

const comparison = `${variable} (not )?was ${datatypes.any}`
const comparisons = `${comparison}((and|or) ${comparison})*`;

function compile({source}) {
  // Cleanup
  source = source.replace(/[ ](?=(?:(?:[^"]*"){2})*[^"]*$)/g, " ");
  let lines = source.split("\n");
  let output = "";

  let level = 0;
  let chapter = 0;

  let state = null;

  for (let lineNumber in lines) {
    let line = lines[lineNumber].replace(/[\r\n]/g, "");
    let tokens = getTokens(line);

    if (line === "Read these books before you read this!") {
      state = "dependencies";
      output += `// DEPENDENCIES\n`;
      continue;
    }

    if (state === "dependencies") {
      if (new RegExp(`${listItemRegExp} .+`, "g").test(line)) {
        let dependency = tokens[1];
        output += `// ${dependency}\n`;
        continue;
      } else {
        state = null;
      }
    }

    if (new RegExp(`Once upon a time`, "g").test(line)) {
      output += `// ${line}\n`;
      continue;
    }

    if (line === "Characters") {
      state = "characters";
      output += `// CHARACTERS\n`;
      continue;
    }

    if (state === "characters") {
      if (new RegExp(`${listItemRegExp} ${variable}`, "g").test(line)) {
        let character = tokens[1];
        output += `let ${character};\n`;
        continue;
      } else {
        state = null;
      }
    }

    if (new RegExp(`^Chapter [0-9]+ - ${variable}.*$`, "g").test(line)) {
      if (level !== 0) {
        throw new Error(`There cannot be chapters inside of other chapters.`);
      }

      let chapterNumber = parseInt(tokens[1]);

      if (!/[0-9]/g.test(chapterNumber) || chapterNumber !== chapter + 1) {
        throw new Error(`Chapters must be in correct order!`);
      }

      // Chapter 1 - Print with a text and a x
      let spec = tokens.slice(5);
      let args = spec.filter(arg => {
        if (["a", "an", "and"].includes(arg)) return false; // Reserved keywords!

        if (!new RegExp(`^${variable}$`).test(arg)) {
          throw new Error(`"${arg}" is not a valid variable name! Must contain only letters.`);
        }

        return true;
      });

      output += `function ${tokens[3]}(${args.join(", ")}) {\n`;
      level++;
      chapter++;
      continue;
    }

    let parts = line.split(/[,](?=(?:(?:[^"]*"){2})*[^"]*$)/g);

    if (new RegExp(`This happend as long as ${comparisons}${punctuationRegExp}`).test(line)) {
      let partTokens = getTokens(parts[0]);
      let comparison = convertComparison(removePunctuation(partTokens.slice(5).join(" ")));
      output += `while (${comparison}) {\n`;
      level++;
      continue;
    }

    if (new RegExp(`But then they met ${variable}${punctuationRegExp}`).test(line)) {
      let person = tokens[4].replace(/\!/g, "");
      output += `let ${person};\n`;
      continue;
    }

    if (new RegExp(`${variable} said: ${datatypes.any}${punctuationRegExp}`).test(line)) {
      let person = tokens[0];
      let said = removePunctuation(tokens.slice(2).join(" "));
      output += `console.log("${person}: " + ${said});\n`
      level++;
      continue;
    }

    if (new RegExp(`This happend ${datatypes.number} times:`).test(line)) {
      let iterations = tokens[2];
      let varname = `iterator_${level}`;
      output += `for (let ${varname} = 0; ${varname} < ${iterations}; ${varname}++) {\n`
      level++;
      continue;
    }

    if (closingSentences.includes(line)) {
      if (level > 0) {
        output += "}\n";
        level--;
        continue;
      } else {
        throw new Error(`Oh no! You cannot close more blocks than you open (more "}" than "{")!`)
      }
    }

    if (new RegExp(`^And they lived happily ever after${punctuationRegExp}$`).test(line)) {
      output += `console.log("Narrator: End of story.");\n`;
      output += `process.exit(0);\n`;
      continue;
    }

    output += line + "\n";
  }

  return prettier.format(output);
  //return output;
}

function getTokens(line) {
  return line.split(/[ ](?=(?:(?:[^"]*"){2})*[^"]*$)/g);
}

function convertComparison(compare) {
  compare = compare.replace(/or/g, "||");
  compare = compare.replace(/and/g, "&&");
  compare = compare.replace(/not was(?=(?:(?:[^"]*"){2})*[^"]*$)/g, "!=");
  compare = compare.replace(/was(?=(?:(?:[^"]*"){2})*[^"]*$)/g, "==");
  return compare;
}

function removePunctuation(sentence) {
  return sentence.replace(new RegExp(`[${punctuationRegExp}](?=(?:(?:[^"]*"){2})*[^"]*$)`, "g"), "");
}

exports.compile = compile;