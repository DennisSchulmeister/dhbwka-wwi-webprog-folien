"use strict";

const path = require("path");
const shell = require("shelljs");

const build_dir = path.normalize(path.join(__dirname, "..", process.env.npm_package_config_build_dir));

shell.rm("-rf", path.join(build_dir, "*"));
