const fs = require("fs");
const path = require("path");

function escapeLocalizedMessage(text) {
  text = text.split("&").join("&amp;").split("<").join("&lt;");
  // The space is a workaround for that react-intl doesn't support empty message
  text = " " + text;
  return text;
}

function escapeLocalizedMessages(object) {
  if (typeof object === "string") return escapeLocalizedMessage(object);

  const result = {};
  for (const i in object) {
    result[i] = escapeLocalizedMessages(object[i]);
  }
  return result;
}

// From https://stackoverflow.com/questions/5827612/node-js-fs-readdir-recursive-directory-search
async function* readDirectoryRecursively(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const dirent of dirents) {
    const res = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      yield* readDirectoryRecursively(res);
    } else {
      yield res;
    }
  }
}

module.exports = async (locale, loaderContext) => {
  loaderContext.addDependency(__filename);

  const result = {};
  const localeDirectory = path.resolve(__dirname, locale);
  for await (const absolutePath of readDirectoryRecursively(localeDirectory)) {
    const relativePath = path.relative(localeDirectory, absolutePath);
    const objectPath = relativePath.slice(0, -3); // Remove ".js"

    loaderContext.addDependency(absolutePath);
    result[objectPath.split("/").join(".")] = escapeLocalizedMessages(require(absolutePath));
  }

  return {
    cachable: true,
    code: `module.exports = require("flat")(${JSON.stringify(result)});`
  };
};
