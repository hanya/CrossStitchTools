'use strict';

import { colorPalettes } from './colors.js';
import { PDFWriter } from './pdf.js';
import { SVGWriter } from './svg.js';
import { SVGInHTMLWriter } from './html.js';
import { script } from './svg.js';
import { countsList } from './fabric.js';
import { TT } from './jp.js';
import { distance2, rgbToHex, toRGB, toGrayscale, isBlack, colorSearch } from './color.js';


const paperSize = ["A4", "A3", "B5", "B4", "Postcard"];

class Cluster {
    constructor(r, g, b, keep) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.er = 0;
        this.eg = 0;
        this.eb = 0;
        this.count = 0;
        this.color = null;
        this.keep = keep;
    }

    add(r, g, b) {
        this.er += r;
        this.eg += g;
        this.eb += b;
        this.count += 1;
    }

    average() {
        if (this.keep) {
            return new Cluster(this.r, this.g, this.b);
        } else {
            const size = this.count;
            return new Cluster(Math.floor(this.er / size), Math.floor(this.eg / size), Math.floor(this.eb / size));
        }
    }

    update() {
        this.color = Jimp.rgbaToInt(Math.floor(this.r), Math.floor(this.g), Math.floor(this.b), 255);
        this.count = 0;
    }
}

function kmeanspp(image, k) {
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    if (width * height < k) {
        k = width * height;
    }
    const data = image.bitmap.data;

    let centers = [];

    // first center
    {
        const firstX = Math.floor(Math.random() * (width - 1));
        const firstY = Math.floor(Math.random() * (height - 1));
        const c = Jimp.intToRGBA(image.getPixelColor(firstX, firstY));
        centers.push(new Cluster(c.r, c.g, c.b));
    }

    // random centers
    for (let n = 0; n < k; n++) {
        let d2sum = 0;
        const d2s = [];
        for (const { x, y, idx, _ } of image.scanIterator(0, 0, width, height)) {
            let dist_min = 256 * 256 * 3;
            for (let j = 0; j < n; j++) {
                const center = centers[j];

                const d2 = distance2(center.r, center.g, center.b, data[idx], data[idx + 1], data[idx + 2]);
                if (d2 < dist_min) {
                    dist_min = d2;
                }
            }
            d2sum += dist_min;
            d2s.push([x, y, dist_min]);
        }
        let prob = Math.random() * d2sum;
        const last = Jimp.intToRGBA(image.getPixelColor(width - 1, height - 1));
        centers.push(new Cluster(last.r, last.g, last.b));
        for (const d2 of d2s) {
            prob -= d2[2];
            if (prob < 0) {
                const c = Jimp.intToRGBA(image.getPixelColor(d2[0], d2[1]));
                centers[n] = new Cluster(c.r, c.g, c.b);
                break;
            }
        }
    }

    const cluster_index = [];
    for (let i = 0; i < width * height; i++) {
        cluster_index.push(0);
    }

    let distortion = 0;
    for (let iter_num = 0; iter_num < 100; iter_num++) {
        const center_new = [];
        for (let i = 0; i < k; i++) {
            center_new.push(null);
        }
        let distortion_new = 0;

        for (const { x, y, idx, _ } of image.scanIterator(0, 0, width, height)) {
            let dist_min = 256 * 256 * 3;

            for (let i = 0; i < k; i++) {
                const center = centers[i];

                const d2 = distance2(center.r, center.g, center.b, data[idx], data[idx + 1], data[idx + 2]);
                if (d2 < dist_min) {
                    dist_min = d2;
                    cluster_index[y * width + x] = i;
                }
            }
            const index = cluster_index[y * width + x];
            const center = centers[index];
            center.add(data[idx], data[idx + 1], data[idx + 2]);
            center_new[index] = center;
            distortion_new += dist_min;
        }

        // Update cluster center to the average
        for (let i = 0; i < k; i++) {
            if (center_new[i]) {
                center_new[i] = center_new[i].average();
            } else {
                k = i - 1;
                break;
            }
        }
        centers = center_new;

        if (iter_num > 0 && distortion - distortion_new < distortion * 0.005) {
            break;
        }
        distortion = distortion_new;
    }

    // calculates center color
    for (const center of centers) {
        center.update();
    }

    for (const { x, y, idx, _ } of image.scanIterator(0, 0, width, height)) {
        const cluster = centers[cluster_index[y * width + x]];
        image.setPixelColor(cluster.color, x, y);
        cluster.count += 1;
    }

    return [image, centers, cluster_index];
}

const interpolations = [
    Jimp.RESIZE_NEAREST_NEIGHBOR,
    Jimp.RESIZE_BILINEAR,
    Jimp.RESIZE_BICUBIC,
    Jimp.RESIZE_HERMITE,
    Jimp.RESIZE_BEZIER
];
const interpolationNames = [
    'Nearest neighbor', 'Bilinear', 'Bicubic', 'Hermite', 'Bezier'
];

class UI {
    constructor() {
        // hex: color_name
        this.isJP = /^ja\b/.test(navigator.language);
        this.currentPalette = null;
        this.currentPaletteName = null;
        this.replaceColorToNumber = null;
    }

    init() {
        this.fillCount();
        this.selectItemByIndex('counts', 4);
        this.fillColorTable();
        this.selectItemByIndex('color-group', 4);
        this.fillPly();
        this.selectItemByIndex('ply', 3);
        this.fillAddition();
        this.selectItemByIndex('addition', 3);
        this.addColorMode();
        this.addPaperSize();
        this.fillInterpolations();
    }

    translate() {
        if (this.isJP) {
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
    }

    tt(s) {
        if (this.isJP) {
            const t = TT[s];
            return t ? t : s;
        } else {
            return s;
        }
    }

    addOption(parent, s, id) {
        const option = document.createElement('option');
        option.innerText = s;
        if (id) {
            option.setAttribute('id', id);
        }
        parent.appendChild(option);
    }

    selectItemByIndex(id, index) {
        document.getElementById(id).selectedIndex = index;
    }

    fillCount() {
        const counts = document.getElementById('counts');
        for (const entry of countsList) {
            this.addOption(counts, entry[0] + ' / ' + entry[1]);
        }
    }

    fillColorTable() {
        const table = document.getElementById('color-group');
        for (const palette of colorPalettes) {
            this.addOption(table, palette[0]);
        }
    }

    fillPly() {
        const plySelector = document.getElementById('ply');
        const plys = [1, 2, 3, 4, 5, 6, 7, 8];
        for (const entry of plys) {
            this.addOption(plySelector, entry.toString());
        }
    }

    fillAddition() {
        const additionSelector = document.getElementById('addition');
        const additions = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        for (const add of additions) {
            this.addOption(additionSelector, add.toString() + '%');
        }
    }

    addColorMode() {
        const colorModeSelector = document.getElementById('color-mode');
        const colorModes = [["Color", 'color'], ["Grayscale", 'grayscale'], ["No color", 'no-color']];
        for (const mode of colorModes) {
            this.addOption(colorModeSelector, mode[0], mode[1]);
        }
    }

    addPaperSize() {
        const paper = document.getElementById('paper-size');
        for (const size of paperSize) {
            this.addOption(paper, size);
        }
    }

    getPaperSize() {
        const paper = document.getElementById('paper-size');
        return paperSize[paper.selectedIndex];
    }

    isChecked(id) {
        return document.getElementById(id).checked;
    }

    isLandscape() {
        return this.isChecked('landscape');
    }

    fillInterpolations() {
        const isc = document.getElementById('interpolation');
        for (const i of interpolationNames) {
            this.addOption(isc, i, '');
        }
        isc.selectedIndex = 3;
    }

    getInterpolation() {
        const index = document.getElementById('interpolation').selectedIndex;
        return interpolations[index];
    }

    getOmitColors() {
        const r = {};
        const omitData = document.getElementById('omit').value;
        for (const color of omitData.split('\n')) {
            r[color.trim()] = true;
        }
        return r;
    }

    getTitle() {
        return document.getElementById('title').value;
    }

    getAuthor() {
        return document.getElementById('author').value;
    }

    getColorMode() {
        return document.getElementById('color-mode').selectedOptions[0].id;
    }

    getCopyright() {
        return document.getElementById('copyright').value;
    }

    setColor(element, color, showHex) {
        if (showHex) {
            const value = rgbToHex(color[1], color[2], color[3]);
            element.innerHTML = `${color[0]}<br><span class="rgb">${value}</span>`;
        } else {
            element.innerHTML = `${color[0]}<br><span class="rgb">${color[1]}, ${color[2]}, ${color[3]}</span>`;
        }
    }

    isHex() {
        return this.isChecked('hex');
    }

    readRGB() {
        const value = document.getElementById('rgb-value').value.trim();
        return toRGB(value);
    }

    readReplaceColors() {
        this.replaceColorToNumber = new Map();
        const lines = document.getElementById('color-number').value.split('\n');
        for (const line of lines) {
            const ps = line.split(' ');
            this.replaceColorToNumber.set(ps[0], ps[1]);
        }
    }

    findPalette(name) {
        for (const [paletteName, palette] of colorPalettes) {
            if (name == paletteName) {
                return palette;
            }
        }
        return [];
    }

    parsePalette(name) {
        if (this.currentPaletteName == null || this.currentPaletteName != name) {
            this.currentPalette = new Map();
            const palette = this.findPalette(name);
            for (const color of palette) {
                this.currentPalette.set(color[1], color[0]);
            }
        }
    }

    getPaletteName() {
        return colorPalettes[document.getElementById('color-group').selectedIndex][0];
    }

    getCurrentPalette() {
        const name = this.getPaletteName();
        return this.findPalette(name);
    }

    clearResult() {
        document.getElementById('pdf').data = '';
        document.getElementById('svg_image').src = '';
        //document.getElementById('data_image_converted').src = '';
    }

    setSVG(dom) {
        const f = new File([dom.outerHTML], "pattern.svg", {type: "image/svg+xml"});
        const url = URL.createObjectURL(f);
        document.getElementById('svg_image').src = url;
    }

    getColorsCount() {
        return document.getElementById('colors').value;
    }

    getWidth() {
        return document.getElementById('width').value;
    }

    setWidth(width) {
        document.getElementById('width').value = width;
    }

    setImageSize(width, height) {
        document.getElementById('data-image-size').textContent = `${width} x ${height}`;
    }

    setConvertedImageSize(width, height) {
        document.getElementById('data-image-converted-size').textContent = `${width} x ${height}`;
    }

    getPosterizeLevel() {
        return parseInt(document.getElementById('posterize').value, 10);
    }

    getImage() {
        const img = document.getElementById('data_image');
        return img.src;
    }

    setImage(src) {
        const img = document.getElementById('data_image');
        img.src = src;
    }

    hasImage() {
        const img = document.getElementById('data_image');
        return img.src != '';
    }

    getImageConverted() {
        const img = document.getElementById('data_image_converted');
        return img.src;
    }

    setImageConverted(src) {
        const img = document.getElementById('data_image_converted');
        img.src = src;
    }

    getImageReplaced() {
        const img = document.getElementById('data_image_replaced');
        return img.src;
    }

    setImageReplaced(src) {
        const img = document.getElementById('data_image_replaced');
        img.src = src;
    }

    getSomeImage() {
        let src = this.getImageReplaced();
        if (src == '') {
            src = this.getImageConverted();
        }
        if (src == '') {
            src = this.getImage();
        }
        return src;
    }

    getOriginalOrConvertedImage() {
        let src = this.getImageConverted();
        if (src == '') {
            src = this.getImage();
        }
        return src;
    }

    setPDF(url) {
        document.getElementById('pdf').data = url;
    }

    setSVGHTML(url) {
        document.getElementById('svg_html_image').src = url;
        document.getElementById('svg-html-link').href = url;
        document.getElementById('svg-html-link').textContent = url;
        document.getElementById('svg_html_image').style.visibility = 'visible';
    }

    getButton(id) {
        return document.getElementById(id);
    }

    addTD(parent, s) {
        const td = document.createElement('td');
        parent.appendChild(td);
        td.textContent = s;
    }

    clearColortable() {
        const table = document.getElementById('color-table');
        while (table.firstChild) {
            table.removeChild(table.firstChild);
        }
        const tr = document.createElement('tr');
        table.appendChild(tr);
        this.addTD(tr, this.tt('Original'));
        //this.addTD(tr, '');
        this.addTD(tr, this.tt('Selected'));
        this.addTD(tr, 'Color 1');
        this.addTD(tr, 'Color 2');
        this.addTD(tr, 'Color 3');
        this.addTD(tr, 'Color 4');
        this.addTD(tr, 'Color 5');
        this.addTD(tr, 'Color 6');
        this.addTD(tr, 'Color 7');
    }

    addColorCell(parent, r, g, b, target, selectable=false) {
        const td = document.createElement('td');
        parent.appendChild(td);

        const hex = rgbToHex(r, g, b);
        td.style = 'background: #' + hex + ';';
        td.setAttribute('class', selectable ? 'color-select' : 'color');
        if (target) {
            td.setAttribute('target', target);
        }
        return [td, hex];
    }

    addLabelCell(parent, name, hex, id) {
        const label = document.createElement('td');
        parent.appendChild(label);
        const nameLabel = name ? name : '';
        const nameSpan = this.createSpan(label, name, 'name');
        label.appendChild(document.createElement('br'));
        const hexSpan = this.createSpan(label, hex);
        hexSpan.setAttribute('class', 'rgb');
        if (id) {
            nameSpan.setAttribute('id', id + '-name');
            hexSpan.setAttribute('id', id + '-hex');
        }
    }

    addColor(color, name, rowID, colors, eventListener, centerID) {
        const table = document.getElementById('color-table');
        const tr = document.createElement('tr');
        table.appendChild(tr);
        const tr2 = document.createElement('tr');
        table.appendChild(tr2);

        // original color
        const [originalCell, originalHex] = this.addColorCell(tr, color.r, color.g, color.b);
        this.addLabelCell(tr2, name, originalHex);
        originalCell.setAttribute('id', rowID + '-original');
        originalCell.setAttribute('color', originalHex);

        // selected color
        const color0 = colors.ciede2k[0][0];
        const [selectedCell, selectedHex] = this.addColorCell(tr, color0[2], color0[3], color0[4]);
        this.addLabelCell(tr2, color0[0], color0[1], rowID);
        selectedCell.setAttribute('id', rowID);
        selectedCell.setAttribute('color', color0[1]);
        selectedCell.setAttribute('color-name', color0[0]);
        selectedCell.setAttribute('center-id', centerID.toString());

        function addRow() {
            const row = document.createElement('tr');
            table.appendChild(row);
            const cell1 = document.createElement('td');
            const cell2 = document.createElement('td');
            row.appendChild(cell1);
            row.appendChild(cell2);
            return row;
        }

        const rows = [
            tr, tr2,
            addRow(), addRow(),
            addRow(), addRow(),
            addRow(), addRow(),
        ];

        const add = (cs, row0, row1) => {
            for (const cc of cs) {
                const c = cc[0];
                const [cell, hex] = this.addColorCell(row0, c[2], c[3], c[4], rowID, true);
                this.addLabelCell(row1, c[0], hex);
                cell.setAttribute('color', c[1]);
                cell.setAttribute('color-name', c[0]);
                cell.addEventListener('click', eventListener);
            }
        }
        add(colors.ciede2k, rows[0], rows[1]);
        add(colors.rgb, rows[2], rows[3]);
        add(colors.xyz, rows[4], rows[5]);
        add(colors.lab, rows[6], rows[7]);
    }

    createSpan(parent, s, claz, id) {
        const span = document.createElement('span');
        span.textContent = s;
        parent.appendChild(span);
        if (claz) {
            span.setAttribute('class', claz);
        }
        return span;
    }
}


window.onload = function () {
    const ui = new UI();
    ui.init();
    ui.translate();

    let colorsCount = null;
    let colorCenters = null;
    let colorIndexes = null;
    let imageWidth = null;
    let imageHeight = null;

    function replaceColor(srcColor, destColor, centerID) {
        const src = ui.getSomeImage();
        Jimp.read(src).then((image) => {
            const rgb = toRGB(destColor);
            const color = Jimp.rgbaToInt(rgb[1], rgb[2], rgb[3], 255);
            const centerIndex = parseInt(centerID, 10);
            const indexes = colorIndexes[centerIndex];
            for (const [x, y] of indexes) {
                image.setPixelColor(color, x, y);
            }

            image.getBase64(Jimp.MIME_PNG, function (err, src) {
                ui.setImageReplaced(src);
            });
        });
    }

    function colorChange(ev) {
        const id = ev.target.getAttribute('target');
        const target = document.getElementById(id);
        if (target) {
            const color = ev.target.getAttribute('color');
            target.setAttribute('color', color);
            target.style = 'background: #' + color + ';';

            const colorName = ev.target.getAttribute('color-name');
            const nameSpan = document.getElementById(id + '-name');
            nameSpan.textContent = colorName;
            const hexSpan = document.getElementById(id + '-hex');
            hexSpan.textContent = color;
            const centerID = target.getAttribute('center-id');
            replaceColor(target.getAttribute('color'), color, centerID);
        }
    }

    const parseColor = () => {
        const src = ui.getOriginalOrConvertedImage();
        Jimp.read(src).then((image) => {
            const maxColors = ui.getColorsCount();
            const [convertedImage, centers] = kmeanspp(image, maxColors);

            centers.sort(function (a, b) { return a.count < b.count });
            colorsCount = centers.length;
            colorCenters = centers;
            colorIndexes = [];
            imageWidth = convertedImage.bitmap.width;
            imageHeight = convertedImage.bitmap.height;

            ui.clearColortable();
            const palette = ui.getCurrentPalette();
            for (let n = 0; n < colorsCount; n++) {
                const center = colorCenters[n];
                const color = center.color;
                const rgb = Jimp.intToRGBA(center.color);
                const colors = colorSearch(palette, rgb.r, rgb.g, rgb.b, 7);
                ui.addColor(rgb, null, 'color' + n.toString(), colors, colorChange, n);
                const cc = colors.ciede2k[0][0];
                const newColor = Jimp.rgbaToInt(cc[2], cc[3], cc[4], 255);
                const index = [];

                for (const { x, y, idx, _ } of convertedImage.scanIterator(0, 0, imageWidth, imageHeight)) {
                    if (convertedImage.getPixelColor(x, y) == color) {
                        convertedImage.setPixelColor(newColor, x, y);
                        index.push([x, y]);
                    }
                }
                colorIndexes.push(index);
            }

            convertedImage.getBase64(Jimp.MIME_PNG, function (err, src) {
                ui.setImageReplaced(src);
            });
        });
    }

    function convertImage() {
        ui.clearResult();

        const src = ui.getImage();
        Jimp.read(src).then((image) => {
            const resizedWidth = ui.getWidth();
            if (ui.isChecked('apply-resize') && image.bitmap.width != resizedWidth) {
                const interpolationMethod = ui.getInterpolation();
                image.resize(resizedWidth, Jimp.AUTO, interpolationMethod);
            }
            if (ui.isChecked('apply-posterize')) {
                image.dither565();
                const posterizeLevel = ui.getPosterizeLevel();
                image.posterize(posterizeLevel);
            }

            image.getBase64(Jimp.MIME_PNG, function (err, src) {
                ui.setImageConverted(src);
            });
            ui.setConvertedImageSize(image.bitmap.width, image.bitmap.height);
        });
    }

    const fileInput = document.getElementById('file_input');

    function handleFile() {
        if (this.files.length == 1) {
            ui.setImage(URL.createObjectURL(this.files[0]));

            Jimp.read(ui.getImage()).then(function (image) {
                const width = image.bitmap.width;
                ui.setWidth(width);
                ui.setImageSize(width, image.bitmap.height);
            });
        }
    }

    fileInput.addEventListener('change', handleFile, false);

    ui.getButton('select').addEventListener('click', (e) => {
        fileInput.click();
        e.preventDefault();
    }, false);

    ui.getButton('convert').addEventListener('click', () => {
        if (ui.hasImage()) {
            convertImage();
        }
    });

    ui.getButton('create').addEventListener('click', () => {
        if (ui.hasImage()) {
            generatePattern();
        }
    });

    ui.getButton('convert-color').addEventListener('click', () => {
        if (ui.hasImage()) {
            parseColor();
        }
    });

    function generatePattern() {
        ui.clearResult();
        ui.parsePalette(ui.getPaletteName());
        ui.readReplaceColors();

        const src = ui.getSomeImage();
        Jimp.read(src).then(function (image) {
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

            const omitColors = ui.getOmitColors();

            // Creates color information
            let unknownColorCount = 0;
            const colorEntries = [];
            for (const [hex, count] of colorCounter) {
                let colorName = ui.currentPalette.get(hex);
                if (!colorName) {
                    colorName = 'UN' + unknownColorCount.toString();
                    unknownColorCount += 1;
                }
                if (ui.replaceColorToNumber.get(colorName)) {
                    colorName = ui.replaceColorToNumber.get(colorName);
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

            const title = ui.getTitle();
            const author = ui.getAuthor();
            const copyright = ui.getCopyright();
            let svgDom = null;

            if (ui.isChecked('svg-check') || ui.isChecked('svg-html-check')) {
                svgDom = genSVG(image, colorData, title, author, copyright);
                if (ui.isChecked('svg-check')) {
                    ui.setSVG(svgDom);
                }
            }
            if (ui.isChecked('pdf-check')) {
                genPDF(image, colorData, title, author, copyright);
            }
            if (ui.isChecked('svg-html-check')) {
                genSVGInHTML(svgDom, title);
            }
        });
    }

    function genPDF(image, colorData, title, author, copyright) {
        new PDFWriter({
                title: title,
                author: author,
                copyright: copyright,
                color_mode: ui.getColorMode(),
                paperSize: ui.getPaperSize(),
                landscape: ui.isLandscape(),
                isJP: ui.isJP,
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

            pw.output((a) => {
                const f = new File([a], "pattern.pdf", {type: "application/pdf"});
                const url = URL.createObjectURL(f);
                ui.setPDF(url);
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
            isJP: ui.isJP,
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
        ui.setSVGHTML(url);
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
