"use strict";

import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

import * as esbuild from "esbuild";
import { lessLoader } from "esbuild-plugin-less";
import path from "path";

esbuild.build({
    entryPoints: [path.join(__dirname, "..", "index.js")],
    bundle: true,
    minify: true,
    outfile: path.join(__dirname, "..", "build", "_bundle.js"),
    sourcemap: true,
    plugins: [lessLoader()],
    loader: {
        ".svg": "text",
        ".ttf": "dataurl",
        ".woff": "dataurl",
        ".woff2": "dataurl",
        ".eot": "dataurl",
        ".jpg": "dataurl",
        ".png": "dataurl",
        ".gif": "dataurl",
    },
});
