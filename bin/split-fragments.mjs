"use strict";

/*
 * Splits the fragment files referenced by the chapter files (1-intro.html,
 * 2-html_css.html, 3-responsive.html, 4-js-grundlagen.html) into individual
 * per-<section> HTML fragments.
 *
 * For each fragment `<chapter>/<subsection>.html`:
 *   - The first <section> (the teilkapitel title slide) stays in the fragment
 *     file, followed by one <ls-include> per split section.
 *   - Each remaining <section> is written to
 *     `<chapter>/<subsection>/<slug>.html`, its assets move into the sibling
 *     directory `<chapter>/<subsection>/<slug>/`, and the reference attributes
 *     inside the section are rewritten.
 *   - Assets used by more than one split fragment are moved to `shared/`.
 *
 * Only real reference attributes (src, href, data-src, data-background-image,
 * data-background-video, poster, srcset, style), CSS url() references inside
 * <style>/style="..." and local path strings inside live <script> blocks are
 * rewritten. Escaped code samples and text content are left untouched.
 *
 * Usage:
 *   node bin/split-fragments.mjs
 *   node bin/split-fragments.mjs --dry-run
 */

import fs   from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticDir = path.normalize(path.join(__dirname, "..", "static"));

const DRY_RUN = process.argv.includes("--dry-run");

const REF_ATTR_NAMES = new Set([
    "src", "href", "srcset", "poster", "img",
    "data-src", "data-background-image", "data-background-video",
]);

const FRAGMENTS = [
    "1-intro/1-hinweise.html",
    "1-intro/2-grundlagen.html",
    "2-html_css/1-gliederung.html",
    "2-html_css/2-layouts.html",
    "2-html_css/3-fortgeschritten.html",
    "2-html_css/4-uebungen.html",
    "3-responsive/1-design.html",
    "3-responsive/2-bootstrap.html",
    "3-responsive/3-uebungen.html",
    "4-js-grundlagen/1-grundlagen.html",
    "4-js-grundlagen/2-dom.html",
    "4-js-grundlagen/3-uebungen.html",
];

const SAMPLE_TAGS = new Set(["pre", "textarea", "code", "src-code", "tt", "kbd", "samp", "xmp"]);

// ---------------------------------------------------------------------------
// Text analysis / tokenizer
// ---------------------------------------------------------------------------

// Analyze an HTML string and return
//   - tagAttrs:    real reference/`style` attributes with byte positions
//   - styleSpans:  content ranges of <style> elements
//   - scriptSpans: content ranges of live <script> elements
//   - skipText:    whether any code-sample element was found
// The tokenizer jumps over the content of raw-text / sample elements, so no
// positions inside escaped <code> samples or <script type="text/plain">
// listings are ever reported.
function analyzeHtml(text) {
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

    const tagAttrs    = [];
    const styleSpans  = [];
    const scriptSpans = [];
    const hasSamples  = false;

    let pos = 0;

    while (pos < text.length) {
        const lt = text.indexOf("<", pos);

        if (lt < 0) break;

        const ch = lt + 1 < text.length ? text[lt + 1] : "";

        if (!ch || !/[a-zA-Z!/?]/.test(ch)) {
            pos = lt + 1;
            continue;
        }

        let quote = null;
        let end   = -1;

        for (let j = lt + 1; j < text.length; j++) {
            const c = text[j];

            if (quote) {
                if (c === quote) quote = null;
            } else if (c === '"' || c === "'") {
                quote = c;
            } else if (c === ">") {
                end = j;
                break;
            }
        }

        if (end < 0) break;

        const tagContent   = text.slice(lt + 1, end);
        const isCloseTag   = /^\s*\//.test(tagContent);
        const nameMatch    = tagContent.match(/([a-zA-Z][^\s/>]*)/);
        const name         = nameMatch ? nameMatch[1].toLowerCase() : "";
        const isRaw        = ["script", "style", "textarea"].includes(name);
        const plainScript  = name === "script" && /type\s*=\s*("|')?text\/plain\1/i.test(tagContent);
        const isSample     = SAMPLE_TAGS.has(name) || plainScript;

        if (isCloseTag) {
            pos = end + 1;
            continue;
        }

        const contentStart = end + 1;
        let contentEnd     = contentStart;

        if (isRaw || isSample) {
            const closeRe = new RegExp(`</${name}\\s*>`, "i");
            const m       = text.slice(contentStart).match(closeRe);

            if (m) contentEnd = contentStart + m.index;
        }

        if (isSample) {
            // Contents of sample elements are neither rewritten nor scanned.
            pos = contentEnd;
            continue;
        }

        if (isRaw && name === "style") {
            styleSpans.push({ start: contentStart, end: contentEnd });
        }

        if (isRaw && name === "script") {
            scriptSpans.push({ start: contentStart, end: contentEnd });
        }

        if (!isCloseTag && !isRaw) {
            let m;

            attrRe.lastIndex = 0;

            while ((m = attrRe.exec(tagContent))) {
                const attrName = m[1].toLowerCase();

                if (!REF_ATTR_NAMES.has(attrName) && attrName !== "style") continue;

                let value, valueStart;

                if (m[3] !== undefined) {
                    value      = m[3];
                    valueStart = lt + 1 + m.index + m[0].indexOf('"') + 1;
                } else if (m[4] !== undefined) {
                    value      = m[4];
                    valueStart = lt + 1 + m.index + m[0].indexOf("'") + 1;
                } else {
                    value      = m[5];
                    valueStart = lt + 1 + m.index + m[0].indexOf("=") + 1;
                }

                tagAttrs.push({
                    name:      attrName,
                    value,
                    start:     valueStart,
                    end:       valueStart + value.length,
                });
            }
        }

        pos = contentEnd;
    }

    return { tagAttrs, styleSpans, scriptSpans, hasSamples };
}

// ---------------------------------------------------------------------------
// Reference extraction
// ---------------------------------------------------------------------------

function cleanReference(value) {
    let ref = String(value).trim();
    let cut = ref.length;

    for (let i of [ref.indexOf("?"), ref.indexOf("#")]) {
        if (i >= 0 && i < cut) cut = i;
    }

    return ref.slice(0, cut)
        .replace(/&amp;/g, "&")
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<");
}

function isLocalRef(ref) {
    return ref && !ref.startsWith("/") && !ref.startsWith("#") &&
        !ref.startsWith("data:") && !ref.startsWith("http:") &&
        !ref.startsWith("https:") && !ref.startsWith("mailto:") &&
        !ref.startsWith("//") && !ref.startsWith("$");
}

// Collect web-root-relative paths (that resolve to existing files) from an
// HTML fragment.
function collectRefs(text) {
    const { tagAttrs, styleSpans, scriptSpans } = analyzeHtml(text);

    const found = new Set();
    const urlRe = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^"')]+))\s*\)/g;

    for (let attr of tagAttrs) {
        if (attr.name === "style") {
            for (let m of text.slice(attr.start, attr.end).matchAll(urlRe)) {
                const ref = cleanReference(m[1] || m[2] || m[3]);

                if (isLocalRef(ref)) found.add(ref);
            }
        } else {
            const ref = cleanReference(attr.value);

            if (isLocalRef(ref)) found.add(ref);
        }
    }

    for (let span of styleSpans) {
        for (let m of text.slice(span.start, span.end).matchAll(urlRe)) {
            const ref = cleanReference(m[1] || m[2] || m[3]);

            if (isLocalRef(ref)) found.add(ref);
        }
    }

    for (let span of scriptSpans) {
        const quotedRe = /["']([^"'\s]+\.(?:png|jpe?g|gif|svg|webm|mp4|ogg|css|scss|sass|less|js|mjs|json|html|woff2?|ttf|eot|otf)(?:\?[^"']*)?)["']/g;

        for (let m of text.slice(span.start, span.end).matchAll(quotedRe)) {
            const ref = cleanReference(m[1]);

            if (isLocalRef(ref)) found.add(ref);
        }
    }

    return found;
}

function scanFileRefs(webPath) {
    const abs = path.join(staticDir, webPath);
    let content;

    try {
        content = fs.readFileSync(abs, "utf8");
    } catch {
        return new Set();
    }

    const dir          = path.posix.dirname(webPath) === "." ? "" : path.posix.dirname(webPath);
    const candidates   = collectRefs(content);
    const urlRe        = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^"')]+))\s*\)/g;
    const quotedPathRe = /["']([^"'\s]+\.(?:png|jpe?g|gif|svg|webm|mp4|ogg|css|scss|sass|less|js|mjs|json|html|woff2?|ttf|eot|otf)(?:\?[^"']*)?)["']/g;
    const resolved     = new Set();

    const consider = (ref) => {
        ref = cleanReference(ref);

        if (!isLocalRef(ref)) return;

        const combined = path.posix.normalize(`${dir}/${ref}`);

        if (combined.startsWith("..") || path.isAbsolute(combined) || combined.startsWith("shared/")) return;
        if (!fs.existsSync(path.join(staticDir, combined))) return;

        resolved.add(combined);
    };

    for (let ref of candidates) consider(ref);

    if (path.extname(webPath).toLowerCase() === ".css") {
        for (let m of content.matchAll(urlRe)) consider(m[1] || m[2] || m[3]);
    } else if (path.extname(webPath).toLowerCase() === ".js") {
        for (let m of content.matchAll(quotedPathRe)) consider(m[1]);
    }

    return resolved;
}

// ---------------------------------------------------------------------------
// Rewriting
// ---------------------------------------------------------------------------

// Rewrite local reference paths in the analyzed regions of `text`. Returns the
// rewritten text. Only attribute values, <style> content, style="..." CSS and
// live <script> content are touched.
function rewriteRefs(text, relocations) {
    const { tagAttrs, styleSpans, scriptSpans } = analyzeHtml(text);

    if (relocations.size === 0) return text;

    const byOldLength = [...relocations].sort((a, b) => b[0].length - a[0].length);
    const edits       = [];  // {start, end, newText}

    const replaceIn = (rangeText) => {
        let out = rangeText;

        for (let [oldPath, newPath] of byOldLength) {
            out = out.split(oldPath).join(newPath);
        }

        return out;
    };

    for (let attr of tagAttrs) {
        const oldRef = cleanReference(attr.value);
        let newValue = null;

        if (attr.name === "style") {
            newValue = replaceIn(attr.value);
        } else if (relocations.has(oldRef)) {
            const suffix = attr.value.slice(oldRef.length);
            newValue     = relocations.get(oldRef) + suffix;
        }

        if (newValue !== null && newValue !== attr.value) {
            edits.push({ start: attr.start, end: attr.end, newText: newValue });
        }
    }

    for (let span of styleSpans) {
        const newText = replaceIn(text.slice(span.start, span.end));

        if (newText !== text.slice(span.start, span.end)) {
            edits.push({ start: span.start, end: span.end, newText });
        }
    }

    for (let span of scriptSpans) {
        const newText = replaceIn(text.slice(span.start, span.end));

        if (newText !== text.slice(span.start, span.end)) {
            edits.push({ start: span.start, end: span.end, newText });
        }
    }

    edits.sort((a, b) => b.start - a.start);

    let output = text;

    for (let edit of edits) {
        output = output.slice(0, edit.start) + edit.newText + output.slice(edit.end);
    }

    return output;
}

// ---------------------------------------------------------------------------
// Naming helpers
// ---------------------------------------------------------------------------

function slugify(text) {
    return String(text || "")
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/&amp;/g, "und")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function firstHeading(section) {
    const m = section.match(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/);

    if (!m) return "";

    return m[1]
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/\s+/g, " ")
        .trim();
}

function sectionTitle(section) {
    const m = section.match(/<section\b[^>]*\bdata-title\s*=\s*("([^"]*)"|'([^']*)')/);

    return m ? (m[2] || m[3] || "") : "";
}

// ---------------------------------------------------------------------------
// Section splitting
// ---------------------------------------------------------------------------

function splitSections(html) {
    const sections = [];
    let searchPos  = 0;

    while (true) {
        const open = html.indexOf("<section", searchPos);

        if (open < 0) break;

        let tagEnd = open + "<section".length;
        let quote  = null;

        while (tagEnd < html.length) {
            const ch = html[tagEnd];

            if (quote) {
                if (ch === quote) quote = null;
            } else if (ch === '"' || ch === "'") {
                quote = ch;
            } else if (ch === ">") {
                break;
            }

            tagEnd++;
        }

        let close   = -1;
        let depth   = 1;
        let scanPos = tagEnd + 1;

        while (depth > 0 && scanPos < html.length) {
            const nextOpen  = html.indexOf("<section", scanPos);
            const nextClose = html.indexOf("</section", scanPos);

            if (nextClose >= 0 && (nextOpen < 0 || nextClose < nextOpen)) {
                depth--;
                scanPos = nextClose + "</section".length;

                if (depth === 0) {
                    const gt = html.indexOf(">", scanPos);

                    close = gt >= 0 ? gt + 1 : html.length;
                }
            } else if (nextOpen >= 0) {
                depth++;
                scanPos = nextOpen + "<section".length;
            } else {
                break;
            }
        }

        if (close < 0) break;

        sections.push(html.slice(open, close));
        searchPos = close;
    }

    return sections;
}

export { analyzeHtml, collectRefs, splitSections, sectionTitle, firstHeading, slugify, cleanReference, rewriteRefs, staticDir };

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
const parsed = [];

for (let fragment of FRAGMENTS) {
    const chapter    = fragment.split("/")[0];
    const subsection = fragment.replace(/\.html$/, "").split("/").pop();
    const chapterDir = `${chapter}/${subsection}`;
    const html       = fs.readFileSync(path.join(staticDir, fragment), "utf8");
    const sections   = splitSections(html);

    if (sections.length < 2) {
        console.warn(`WARN ${fragment}: only ${sections.length} section(s), nothing to split`);
        continue;
    }

    const slugs     = [];
    const sectionIds = [];
    const used      = new Set();

    for (let index = 1; index < sections.length; index++) {
        let slug = slugify(sectionTitle(sections[index]));

        if (!slug) slug = slugify(firstHeading(sections[index]));
        if (!slug) slug = `folie-${index + 1}`;

        let unique = slug;
        let counter = 2;

        while (used.has(unique)) {
            unique = `${slug}-${counter++}`;
        }

        used.add(unique);
        slugs.push(unique);
        sectionIds.push(`${chapterDir}/${unique}`);
    }

    parsed.push({ chapter, subsection, chapterDir, fragment, sections, slugs, sectionIds });
}

// Directly referenced files per split section.
const directRefs   = new Map();   // sectionId -> Set(webPath)
const directOwners = new Map();   // webPath -> Set(sectionId)

for (let info of parsed) {
    for (let index = 0; index < info.sections.length - 1; index++) {
        const sectionId   = info.sectionIds[index];
        const sectionText = info.sections[index + 1];
        const refs        = new Set();

        for (let ref of collectRefs(sectionText)) {
            const abs = path.join(staticDir, ref);

            if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
                refs.add(ref);

                if (!directOwners.has(ref)) directOwners.set(ref, new Set());
                directOwners.get(ref).add(sectionId);
            }
        }

        directRefs.set(sectionId, refs);
    }
}

// Dependency graph between files (for self-contained example projects).
const fileDe       = new Map();  // webPath -> Set(webPath)
const scannedFiles = new Set();

function depsOf(webPath) {
    if (scannedFiles.has(webPath)) return fileDe.get(webPath) || new Set();
    scannedFiles.add(webPath);

    const deps = scanFileRefs(webPath);

    fileDe.set(webPath, deps);
    return deps;
}

// Ensure all directly referenced files are in the graph, then fixpoint.
let queue = [...directOwners.keys()];

for (let ref of queue) depsOf(ref);

let changed = true;
while (changed) {
    changed = false;

    for (let base of [...fileDe.keys()]) {
        for (let dep of fileDe.get(base)) {
            if (!fileDe.has(dep)) {
                depsOf(dep);
                changed = true;
            }
        }
    }
}

// Reachability: which sections use which file (directly or transitively).
const owners = new Map();

for (let ref of [...directOwners.keys(), ...fileDe.keys()]) owners.set(ref, new Set());

for (let info of parsed) {
    for (let index = 0; index < info.sectionIds.length; index++) {
        const sectionId = info.sectionIds[index];
        const todo      = [...directRefs.get(sectionId)];
        const seen      = new Set();

        while (todo.length) {
            const file = todo.shift();

            if (seen.has(file) || !owners.has(file)) continue;
            seen.add(file);
            owners.get(file).add(sectionId);

            for (let dep of depsOf(file)) todo.push(dep);
        }
    }
}

// Compute final locations.
const relocations = new Map();  // webPath -> new webPath

for (let [webPath, sectionIds] of owners) {
    if (sectionIds.size === 0) continue;
    if (webPath.startsWith("shared/")) continue;

    const firstSlash = webPath.indexOf("/");
    const rest       = firstSlash >= 0 ? webPath.slice(firstSlash + 1) : webPath;

    if (sectionIds.size >= 2) {
        relocations.set(webPath, `shared/${rest}`);
    } else {
        const sectionId        = [...sectionIds][0];
        const sectionChapterDir = sectionId.slice(0, sectionId.lastIndexOf("/"));
        const rel              = webPath.startsWith(`${sectionChapterDir}/`)
            ? webPath.slice(sectionChapterDir.length + 1)
            : rest;

        relocations.set(webPath, `${sectionId}/${rel}`);
    }
}

// ---------------------------------------------------------------------------
// Apply
// ---------------------------------------------------------------------------

const movePlan  = [];
const writePlan = [];

const replacementsFor = (chapter) => {
    return new Map(
        [...relocations].filter(([oldPath]) => oldPath.split("/")[0] === chapter),
    );
};

for (let info of parsed) {
    const replacements = replacementsFor(info.chapter);

    for (let index = 0; index < info.slugs.length; index++) {
        const slug        = info.slugs[index];
        const sectionText = rewriteRefs(info.sections[index + 1], replacements);

        writePlan.push({
            path: `${info.chapterDir}/${slug}.html`,
            content: sectionText.trimEnd() + "\n",
        });
    }

    const titleSection = rewriteRefs(info.sections[0], replacements).trimEnd();
    const includes     = info.slugs.map(slug => `<ls-include src="${info.chapterDir}/${slug}.html"></ls-include>`).join("\n");

    writePlan.push({
        path: info.fragment,
        content: `${titleSection}\n\n${includes}\n`,
    });
}

for (let [oldPath, newPath] of relocations) movePlan.push({ from: oldPath, to: newPath });

// ---------------------------------------------------------------------------
// Report / execute
// ---------------------------------------------------------------------------

writePlan.sort((a, b) => a.path.localeCompare(b.path));

for (let { path: filePath } of writePlan) console.log(`WRITE ${filePath}`);
for (let { from, to } of movePlan)  console.log(`MOVE  ${from}  ->  ${to}`);

if (!DRY_RUN) {
    for (let { path: filePath, content } of writePlan) {
        const abs = path.join(staticDir, filePath);

        fs.mkdirSync(path.dirname(abs), { recursive: true });
        fs.writeFileSync(abs, content, "utf8");
    }

    for (let { from, to } of movePlan) {
        const srcAbs = path.join(staticDir, from);
        const dstAbs = path.join(staticDir, to);

        if (!fs.existsSync(srcAbs)) {
            console.warn(`WARN cannot move ${from}: source missing`);
            continue;
        }

        fs.mkdirSync(path.dirname(dstAbs), { recursive: true });
        fs.renameSync(srcAbs, dstAbs);
    }

    // Remove directories that became empty (but never the chapter roots).
    const removeEmpty = (root) => {
        if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) return;

        for (let entry of fs.readdirSync(root)) {
            removeEmpty(path.join(root, entry));
        }

        if (fs.readdirSync(root).length === 0) {
            fs.rmdirSync(root);
        }
    };

    for (let info of parsed) removeEmpty(path.join(staticDir, info.chapter));
}

console.log("---");
console.log(`Fragments: ${parsed.length}`);
console.log(`Sections split: ${parsed.reduce((sum, i) => sum + i.slugs.length, 0)}`);
console.log(`Files written: ${writePlan.length}`);
console.log(`Files moved: ${movePlan.length}`);

if (DRY_RUN) console.log("(dry run – nothing changed)");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main();
}