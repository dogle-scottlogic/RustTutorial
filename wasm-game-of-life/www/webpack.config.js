const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');

module.exports = {
  entry: "./bootstrap.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bootstrap.js",
  },
  experiments: {
    asyncWebAssembly: true,
    syncWebAssembly: true
  },
  mode: "development",
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        "index.html", // absolute or relative, files/directories/globs - see below for examples
      ],
    })
  ],
};
