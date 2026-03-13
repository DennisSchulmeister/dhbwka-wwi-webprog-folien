"use strict";

import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

import * as esbuild from "esbuild";
import { lessLoader } from "esbuild-plugin-less";
import path from "path";

let ctx = await esbuild.context({
    entryPoints: [path.join(__dirname, "..", "index.js")],
    bundle: true,
    outfile: path.join(__dirname, "..", "static", "_bundle.js"),
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
    }
});

let { host, port } = await ctx.serve({
    servedir: path.join(__dirname, "..", "static"),
    port: 8080,
});

console.log(`Listening on ${host}:${port}`);