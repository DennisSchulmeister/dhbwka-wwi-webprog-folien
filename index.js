/*
 * Vorlesung "Webprogrammierung"
 * im Studiengang Wirtschaftsinformatik
 * an der DHBW Karlsurhe
 *
 * © 2017 Dennis Schulmeister-Zimolong <dhbw@windows3.de>
 * Lizenz: Creative Commons Namensnennung 4.0 International
 *
 * Sie dürfen:
 *
 *     Teilen — das Material in jedwedem Format oder Medium vervielfältigen
 *     und weiterverbreiten
 *
 *     Bearbeiten — das Material remixen, verändern und darauf aufbauen
 *     und zwar für beliebige Zwecke, sogar kommerziell.
 *
 * Unter folgenden Bedingungen:
 *
 *     Namensnennung — Sie müssen angemessene Urheber- und Rechteangaben
 *     machen, einen Link zur Lizenz beifügen und angeben, ob Änderungen
 *     vorgenommen wurden. Diese Angaben dürfen in jeder angemessenen Art
 *     und Weise gemacht werden, allerdings nicht so, dass der Eindruck
 *     entsteht, der Lizenzgeber unterstütze gerade Sie oder Ihre Nutzung
 *     besonders.
 *
 *     Keine weiteren Einschränkungen — Sie dürfen keine zusätzlichen Klauseln
 *     oder technische Verfahren einsetzen, die anderen rechtlich irgendetwas
 *     untersagen, was die Lizenz erlaubt.
 *
 * Es werden keine Garantien gegeben und auch keine Gewähr geleistet.
 * Die Lizenz verschafft Ihnen möglicherweise nicht alle Erlaubnisse,
 * die Sie für die jeweilige Nutzung brauchen. Es können beispielsweise
 * andere Rechte wie Persönlichkeits- und Datenschutzrechte zu beachten
 * sein, die Ihre Nutzung des Materials entsprechend beschränken.
 */
"use strict";

import emailLinkJs              from "email-link.js";

import SlideshowPlayer          from "@dschulmeis/lecture-slides.js";
import "./style/style.less";

import LsPluginExtraTags        from "@dschulmeis/ls-plugin-extra-tags";
import LS_Plugin_Markdown       from "@dschulmeis/ls-plugin-markdown";

import LsPluginHighlightJs      from "@dschulmeis/ls-plugin-highlight.js";
import HLJS_Language_HTTP       from 'highlight.js/lib/languages/http';
import HLJS_Language_XML        from 'highlight.js/lib/languages/xml';
import HLJS_Language_CSS        from 'highlight.js/lib/languages/css';
import HLJS_Language_JS         from 'highlight.js/lib/languages/javascript';
import HLJS_Language_JAVA       from 'highlight.js/lib/languages/java';
import HLJS_Language_SHELL      from 'highlight.js/lib/languages/shell';
import "highlight.js/styles/atom-one-light.css";

import LS_Plugin_AceCode        from "@dschulmeis/ls-plugin-ace-code";
import { Mode as AC_Mode_HTML } from "ace-builds/src-noconflict/mode-html.js";
import { Mode as AC_Mode_CSS }  from "ace-builds/src-noconflict/mode-css.js";
import { Mode as AC_Mode_JS }   from "ace-builds/src-noconflict/mode-javascript.js";
import "ace-builds/src-noconflict/theme-cloud9_day";

window.addEventListener("load", async () => {
    let player = new SlideshowPlayer({
        labelPrev:          "Zurück",
        labelNext:          "Weiter",
        labelGoTo:          "Gehe zu",
        labelViewMenu:      "Ansicht",
        labelOverview:      "Übersicht",
        labelSlidesAndText: "Folien und Text",
        labelSlidesOnly:    "Nur Folien",
        labelTextOnly:      "Nur Text",
        labelPrintView:     "Drucken",
        labelFadeToWhite:   "Alles ausblenden (weiß)",
        labelFadeToBlack:   "Alles ausblenden (schwarz)",
        labelFadeBack:      "Klicken, um zu den Folien zurückzukehren",
        slideNumber:        "0",
        mode:               "slideshow",  // "overview",
        linkMode:           "slideshow",
        plugins: {
            Markdown: new LS_Plugin_Markdown(),
            ExtraTags: new LsPluginExtraTags({
                labelCarouselNext:       "Nächstes Bild",
                labelCarouselPrev:       "Vorheriges Bild",
                labelCarouselReset:      "Nochmal von vorne",
                labelGithubEditOnline:   "Online-IDE starten",
                labelGithubEditDownload: "Quellcode herunterladen",
                labelQuizPoints:         "{1} von {2}",
                labelQuizEvaluate:       "Bewerten",
                labelQuizNewTry:         "Neuer Versuch",
                githubEditUrlPrefix:     "https://github.com/DennisSchulmeister/dhbwka-wwi-webprog-quellcodes/tree/master/",
                githubPagesUrlPrefix:    "https://dennisschulmeister.github.io/dhbwka-wwi-webprog-quellcodes/",
            }),
            HighlightJs: new LsPluginHighlightJs({
                languages: {
                    http:       HLJS_Language_HTTP,
                    html:       HLJS_Language_XML,
                    xml:        HLJS_Language_XML,
                    css:        HLJS_Language_CSS,
                    javascript: HLJS_Language_JS,
                    json:       HLJS_Language_JS,
                    java:       HLJS_Language_JAVA,
                    sh:         HLJS_Language_SHELL,
                    shell:      HLJS_Language_SHELL,
                }
            }),
            AceCode: new LS_Plugin_AceCode({
                theme: "cloud9_day",
                modes: {
                    html:       AC_Mode_HTML,
                    css:        AC_Mode_CSS,
                    js:         AC_Mode_JS,
                    javascript: AC_Mode_JS,
                },
            }),
        }
    });

    await player.start();
    emailLinkJs.enableEmailLinks();
});
