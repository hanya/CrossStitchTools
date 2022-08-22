'use strict';

import { colorPalettes } from './colors.js';
import { PDFWriter } from './pdf.js';
import { SVGWriter } from './svg.js';
import { SVGInHTMLWriter } from './html.js';
import { script } from './svg.js';
import { countsList } from './fabric.js';
import { TT } from './jp.js';


const paperSize = ["A4", "A3", "B5", "B4", "Postcard"];

window.onload = function () {
    function addOption(parent, s, id) {
        const option = document.createElement('option');
        option.innerText = s;
        if (id) {
            option.setAttribute('id', id);
        }
        parent.appendChild(option);
    }

    function fillCount() {
        const counts = document.getElementById('counts');
        for (const entry of countsList) {
            addOption(counts, entry[0] + ' / ' + entry[1]);
        }
    }
    fillCount();
    document.getElementById('counts').selectedIndex = 4;

    function fillColorTable() {
        const table = document.getElementById('color-table');
        for (const palette of colorPalettes) {
            addOption(table, palette[0]);
        }
    }
    fillColorTable();
    document.getElementById('color-table').selectedIndex = 2;

    function fillPly() {
        const plySelector = document.getElementById('ply');
        const plys = [1, 2, 3, 4, 5, 6, 7, 8];
        for (const entry of plys) {
            addOption(plySelector, entry.toString());
        }
    }
    fillPly();
    document.getElementById('ply').selectedIndex = 3;

    function fillAddition() {
        const additionSelector = document.getElementById('addition');
        const additions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        for (const add of additions) {
            addOption(additionSelector, add.toString() + '%');
        }
    }
    fillAddition();
    document.getElementById('addition').selectedIndex = 3;

    function addColorMode() {
        const colorModeSelector = document.getElementById('color-mode');
        const colorModes = [["Color", 'color'], ["Grayscale", 'grayscale'], ["No color", 'no-color']];
        for (const mode of colorModes) {
            addOption(colorModeSelector, mode[0], mode[1]);
        }
    }
    addColorMode();

    function addPaperSize() {
        const paper = document.getElementById('paper-size');
        for (const size of paperSize) {
            addOption(paper, size);
        }
    }
    addPaperSize();

    function getPaperSize() {
        const paper = document.getElementById('paper-size');
        return paperSize[paper.selectedIndex];
    }

    function isLandscape() {
        return document.getElementById('landscape').checked;
    }

    const isJP = /^ja\b/.test(navigator.language);
    if (isJP) {
        const title = document.getElementById('page-title')
        title.textContent = TT[title.textContent];
        const spans = document.getElementsByTagName('span');
        for (const span of spans) {
            const s = span.textContent;
            const ts = TT[s];
            if (ts) {
                span.textContent = ts;
            }
        }
        const buttons = document.getElementsByTagName('input');
        for (const button of buttons) {
            if (button.type == 'button') {
                const s = button.value;
                const ts = TT[s];
                if (ts) {
                    button.value = ts;
                }
            }
        }
        const options = document.getElementsByTagName('option');
        for (const option of options) {
            const s = option.textContent;
            const ts = TT[s];
            if (ts) {
                option.textContent = ts;
            }
        }
    }

    function getCopyright() {
        return document.getElementById('copyright').value;
    }

    function setColor(element, color, showHex) {
        if (showHex) {
            const value = rgbToHex(color[1], color[2], color[3]);
            element.innerHTML = `${color[0]}<br><span class="rgb">${value}</span>`;
        } else {
            element.innerHTML = `${color[0]}<br><span class="rgb">${color[1]}, ${color[2]}, ${color[3]}</span>`;
        }
    }

    function isHex() {
        return document.getElementById('hex').checked;
    }

    function toRGB(s) {
        const values = s.split(',');
        if (values.length == 3) {
            return [0,
                    parseInt(values[0].trim()),
                    parseInt(values[1].trim()),
                    parseInt(values[2].trim())];
        } else if (values.length == 1) {
            const color = parseInt(values[0], 16);
            const r = (color & 0xff0000) >> 16;
            const g = (color & 0xff00) >> 8;
            const b = color & 0xff;
            return [0, r, g, b];
        } else {
            return null;
        }
    }

    function readRGB() {
        const value = document.getElementById('rgb-value').value.trim();
        return toRGB(value);
    }

    // hex: color_name
    let currentPalette = null;
    let currentPaletteName = null;
    let replaceColorToNumber = null;

    function readReplaceColors() {
        replaceColorToNumber = new Map();
        const lines = document.getElementById('color-number').value.split('\n');
        for (const line of lines) {
            const ps = line.split(' ');
            replaceColorToNumber.set(ps[0], ps[1]);
        }
    }

    function findPalette(name) {
        for (const [paletteName, palette] of colorPalettes) {
            if (name == paletteName) {
                return palette;
            }
        }
        return [];
    }

    function parsePalette(name) {
        if (currentPaletteName == null || currentPaletteName != name) {
            currentPalette = new Map();
            const palette = findPalette(name);
            for (const color of palette) {
                currentPalette.set(color[1], color[0]);
            }
        }
    }

    function getPaletteName() {
        return colorPalettes[document.getElementById('color-table').selectedIndex][0];
    }

    function clearResult() {
        document.getElementById('pdf').data = '';
        document.getElementById('svg_image').src = '';
    }

    function parseImage() {
        clearResult();
        parsePalette(getPaletteName());
        readReplaceColors();

        const img = document.getElementById('data_image');
        Jimp.read(img.src).then(function (image) {
            const width = image.bitmap.width;
            const height = image.bitmap.height;

            // Count colors
            const colorCounter = new Map();

            for (const { x, y, idx, _ } of image.scanIterator(0, 0, width, height)) {
                const rgba = [
                    image.bitmap.data[idx + 0],
                    image.bitmap.data[idx + 1],
                    image.bitmap.data[idx + 2],
                    image.bitmap.data[idx + 3]
                ];

                const hex = rgbToHex(rgba[0], rgba[1], rgba[2]);
                const count = colorCounter.get(hex);
                if (!count) {
                    colorCounter.set(hex, 1);
                } else {
                    colorCounter.set(hex, count + 1);
                }
            }

            const omitColors = getOmitColors();

            // Creates color information
            let unknownColorCount = 0;
            const colorEntries = [];
            for (const [hex, count] of colorCounter) {
                let colorName = currentPalette.get(hex);
                if (!colorName) {
                    colorName = 'UN' + unknownColorCount.toString();
                    unknownColorCount += 1;
                }
                if (replaceColorToNumber.get(colorName)) {
                    colorName = replaceColorToNumber.get(colorName);
                }

                //  0          1      2        3   4
                // [hex_color, count, labeled, id, is_black, name]
                colorEntries.push([hex, count, omitColors[hex] ? false : true, "", false, colorName]);
            }
            colorEntries.sort(function (a, b) { return b[1] - a[1]; });

            // Assign ID
            let omitCount = 0;
            let n = 0;
            for (const color of colorEntries) {
                // should be labeled
                if (color[2]) {
                    color[3] = n.toString();
                    n += 1;
                } else {
                    color[3] = "omit" + omitCount.toString();
                    omitCount += 1;
                }
                // black or white
                color[4] = isBlack(color[0]);
            }

            // color
            // [[hex_color, count, labeled, id, is_black], ...]
            const colorData = new Map();
            for (const color of colorEntries) {
                colorData.set(color[0], color);
            }

            const title = getTitle();
            const author = getAuthor();
            const copyright = getCopyright();
            let svgDom = null;

            if (isChecked('svg-check') || isChecked('svg-html-check')) {
                svgDom = genSVG(image, colorData, title, author, copyright);
                if (isChecked('svg-check')) {
                    setSVG(svgDom);
                }
            }
            if (isChecked('pdf-check')) {
                genPDF(image, colorData, title, author, copyright);
            }
            if (isChecked('svg-html-check')) {
                genSVGInHTML(svgDom, title);
            }
            /*
            if (isChecked('html-check')) {
                genHTML(image, colorData, title, author, copyright);
            }*/
        });
    }

    function genPDF(image, colorData, title, author, copyright) {
        new PDFWriter({
                title: title,
                author: author,
                copyright: copyright,
                color_mode: getColorMode(),
                paperSize: getPaperSize(),
                landscape: isLandscape(),
                isJP: isJP,
            }, (pw) => {
            const width = image.bitmap.width;
            const height = image.bitmap.height;
            const widthPerPage = pw.widthPerPage;
            const heightPerPage = pw.heightPerPage;
            const pageCountH = Math.ceil(width / widthPerPage);
            const pageCountV = Math.ceil(height / heightPerPage);

            let remainedWidth = width;
            let remainedHeight = height;
            let pageNumber = 1;
            for (let pv = 0; pv < pageCountV; pv++) {
                const pageGridHeight = remainedHeight > heightPerPage ? heightPerPage : remainedHeight;

                for (let ph = 0; ph < pageCountH; ph++) {
                    const pageGridWidth = remainedWidth > widthPerPage ? widthPerPage : remainedWidth;
                    const xp = width - remainedWidth;
                    const yp = height - remainedHeight;
                    pw.startPage(pageNumber, xp, yp, pageGridWidth, pageGridHeight);
                    for (const { x, y, idx, _ } of image.scanIterator(xp, yp, pageGridWidth, pageGridHeight)) {
                        const r = image.bitmap.data[idx + 0];
                        const g = image.bitmap.data[idx + 1];
                        const b = image.bitmap.data[idx + 2];
                        const hex = rgbToHex(r, g, b);
                        const color = colorData.get(hex);
                        if (color) {
                            // id, labeled, is_black
                            pw.addCell(x, y, r, g, b, color[3], color[2], color[4]);
                        }
                    }

                    pw.endPage(xp, yp, pageGridWidth, pageGridHeight);
                    remainedWidth -= widthPerPage;
                    pageNumber += 1;
                }
                remainedWidth = width;
                remainedHeight -= heightPerPage;
            }

            // information page
            const colors = [];
            for (const [key, color] of colorData) {
                //  0          1      2        3   4         5
                // [hex_color, count, labeled, id, is_black, name]
                colors.push({
                    color: color[0],
                    id: color[3],
                    labeled: color[2],
                    isBlack: color[4],
                    count: color[1],
                    name: color[5],
                    gray: toGrayscale(color[0]),
                });
            }
            pw.addColors(colors);
            pw.addPageLocation(pageCountH, pageCountV);

            const pdf = document.getElementById('pdf');

            pw.output((a) => {
                const f = new File([a], "pattern.pdf", {type: "application/pdf"});
                const url = URL.createObjectURL(f);
                pdf.data = url;
            });
        });
    }

    function genSVG(image, colorData, title, author, copyright) {
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const gridSize = 12;//3.1;
        
        const colors = [];
        for (const [key, color] of colorData) {
            colors.push({ color: color[0], id: color[3], name: color[5], is_black: color[4], count: color[1] });
        }
        const w = new SVGWriter(0, 0, width, height, true, gridSize, false, {
            title: title,
            author: author,
            copyright: copyright,
            isJP: isJP,
            colorCount: colors.length,
        });
        w.addCellDefs(colors);

        for (const { x, y, idx, _ } of image.scanIterator(
            0, 0, width, height)) {
            const rgba = [
                image.bitmap.data[idx + 0],
                image.bitmap.data[idx + 1],
                image.bitmap.data[idx + 2],
                image.bitmap.data[idx + 3]
            ];

            const hex = rgbToHex(rgba[0], rgba[1], rgba[2]);

            const color = colorData.get(hex);
            if (color) {
                w.addCell(x, y, color[3], color[2], color[4]);
            } else {
                // todo, show error?
            }
        };

        w.done();
        return w.getDOM();
    }

    function setSVG(dom) {
        const f = new File([dom.outerHTML], "pattern.svg", {type: "image/svg+xml"});
        const url = URL.createObjectURL(f);
        document.getElementById('svg_image').src = url;
    }

    function genSVGInHTML(dom, title) {
        const options = {
            title: title,
        };
        const w = new SVGInHTMLWriter(options, dom);
        const htmlDom = w.done();
        const regex = new RegExp('<script id="svg-script">.*</script>', 'ms');
        let text = '<!DOCTYPE html>' + htmlDom.outerHTML;
        text = text.replace(regex, '<script id="svg-script">' + script + '</script>');
        const f = new File([text], "pattern.html", {type: "text/html"});
        const url = URL.createObjectURL(f);
        document.getElementById('svg_html_image').src = url;
        document.getElementById('svg-html-link').href = url;
        document.getElementById('svg-html-link').textContent = url;
        document.getElementById('svg_html_image').style.visibility = 'visible';
    }

    function genHTML(image, colorData, title, author, copyright) {
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const gridSize = 12;//3.1;
        const w = new HTMLWriter(width, height, gridSize, {
            title: title,
            author: author,
            copyright: copyright,
        });

        const colors = [];
        for (const [key, color] of colorData) {
            colors.push({ color: color[0], id: color[3], name: color[5], is_black: color[4] });
        }
        w.addCellDefs(colors);

        for (const { x, y, idx, _ } of image.scanIterator(
            0, 0, width, height)) {
            const rgba = [
                image.bitmap.data[idx + 0],
                image.bitmap.data[idx + 1],
                image.bitmap.data[idx + 2],
                image.bitmap.data[idx + 3]
            ];

            const hex = rgbToHex(rgba[0], rgba[1], rgba[2]);

            const color = colorData.get(hex);
            if (color) {
                w.addCell(x, y, color[3], color[2], color[4]);
            } else {
                // todo, show error?
            }
        };

        const dom = w.done();
        const text = '<!DOCTYPE html>' + dom.outerHTML;
        const f = new File([text], "pattern.html", {type: "text/html"});
        const url = URL.createObjectURL(f);
        document.getElementById('html_image').src = url;
        document.getElementById('html_image').style.visibility = 'visible';
    }

    function toGrayscale(hex) {
        const nrgb = toRGB(hex);
        const g = 0.2126 * nrgb[1] + 0.7152 * nrgb[2] + 0.0722 * nrgb[3];
        return g;
    }

    function isBlack(hex) {
        const nrgb = toRGB(hex);
        const g = 0.2126 * nrgb[1] + 0.7152 * nrgb[2] + 0.0722 * nrgb[3];
        return g < 128;
    }

    function getOmitColors() {
        const r = {};
        const omitData = document.getElementById('omit').value;
        for (const color of omitData.split('\n')) {
            r[color.trim()] = true;
        }
        return r;
    }

    function getTitle() {
        return document.getElementById('title').value;
    }

    function getAuthor() {
        return document.getElementById('author').value;
    }

    const fileInput = document.getElementById('file_input');
    const fileSelector = document.getElementById('select');

    function getColorMode() {
        return document.getElementById('color-mode').selectedOptions[0].id;
    }

    function handleFile() {
        if (this.files.length == 1) {
            const img = document.getElementById('data_image');
            img.src = URL.createObjectURL(this.files[0]);

            parseImage();
        }
    }

    fileInput.addEventListener('change', handleFile, false);

    fileSelector.addEventListener('click', function(e) {
        if (fileInput) {
            fileInput.click();
        }
        e.preventDefault();
    }, false);

    document.getElementById('create').addEventListener('click', () => {
        const img = document.getElementById('data_image');
        if (img.src) {
            parseImage();
        }
    });

    function isChecked(id) {
        return document.getElementById(id).checked;
    }

    function rgbToHex(r, g, b) {
        let rh = r.toString(16);
        let gh = g.toString(16);
        let bh = b.toString(16);
        return (rh.length == 2 ? rh : "0" + rh) +
               (gh.length == 2 ? gh : "0" + gh) +
               (bh.length == 2 ? bh : "0" + bh);
    }

    function calcThreadLength(count, ply, cpt, addition) {
        const c = 100 / cpt;
        const clen = (Math.sqrt(2) * c) * 2 + c * 2;
        const len = count * clen * (1 + addition);
        const stitchLen = len * ply;
        // 1 skein is 8 m * 6, 48000 mm
        return (48000 / stitchLen).toFixed(1);
    }
}
