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

import emailLinkJs from "email-link.js";

import SlideshowPlayer from "lecture-slides.js";
import "./style/style.less";

import LsPluginExtraTags from "ls-plugin-extra-tags";

import LsPluginHighlightJs from "ls-plugin-highlight.js";
import "highlight.js/styles/atom-one-light.css";

window.addEventListener("load", () => {
    emailLinkJs.enableEmailLinks();

    let player = new SlideshowPlayer({
        labelPrev: "Zurück",
        labelNext: "Weiter",
        labelGoTo: "Gehe zu",
        labelViewMenu: "Ansicht",
        labelOverview: "Übersicht",
        labelSlidesAndText: "Folien und Text",
        labelSlidesOnly: "Nur Folien",
        labelTextOnly: "Nur Text",
        labelPrintView: "Drucken",
        labelFadeToWhite: "Alles ausblenden (weiß)",
        labelFadeToBlack: "Alles ausblenden (schwarz)",
        labelFadeBack: "Klicken, um zu den Folien zurückzukehren",
        mode: "overview",
        linkMode: "slideshow",
        plugins: {
            ExtraTags: new LsPluginExtraTags({
                labelCarouselNext: "Nächstes Bild",
                labelCarouselPrev: "Vorheriges Bild",
                labelCarouselReset: "Nochmal von vorne",
                labelGithubEditOnline: "Online-IDE starten",
                labelGithubEditDownload: "Quellcode herunterladen",
                labelQuizPoints: "{1} von {2}",
                labelQuizEvaluate: "Bewerten",
                labelQuizNewTry: "Neuer Versuch",
                githubEditUrlPrefix: "https://github.com/DennisSchulmeister/dhbwka-wwi-webprog-quellcodes/tree/master/",
            }),
            HighlightJs: new LsPluginHighlightJs(),
        }
    });

    player.start();
});
