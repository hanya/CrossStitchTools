'use strict';

import { countsList } from "./fabric.js";

class ScaleMaker {
    constructor(options, callback) {
        this.mmToPtCoef = 72. / 25.4;
        this.minOffset = this.mmToPt(12.);
        this.correction = 1. + options.correction / 100;

        PDFLib.PDFDocument.create().then(async (doc) => {;
            this.doc = doc;
            this.helveticaFont = await this.doc.embedFont(PDFLib.StandardFonts.Helvetica);
            this.font = this.helveticaFont;

            this.page = null;
            this.rgb = PDFLib.rgb;
            this.lineCapStyle = PDFLib.LineCapStyle;

            if (options.title) {
                this.doc.setTitle(options.title);
            }
            if (options.author) {
                this.doc.setAuthor(options.author);
            }

            this.generate(options.pageSize, options.pitch,
                options.count, options.par10);

            callback(this);
        });
    }

    mmToPt = (v) => {
        return v * this.mmToPtCoef;
    }

    generate = (pageSize, pitch, count, par10) => {
        this.page = this.doc.addPage(pageSize);
        this.page.setFont(this.helveticaFont);
        const size = this.page.getSize();
        this.pageWidth = size.width;
        this.pageHeight = size.height;

        let y = this.minOffset;
        while (y < this.pageHeight - this.minOffset - 30) {
            this.generateScale(y, pitch, count, par10);
            y += 40;
        }
    }

    generateScale = (y, pitch, count, par10) => {
        const pitchPt = this.mmToPt(pitch) * this.correction;
        const th = this.mmToPt(0.2);
        const black = this.rgb(0, 0, 0);
        const butt = this.lineCapStyle.Butt;
        const majorLength = this.mmToPt(4);
        const subMajorLength = this.mmToPt(3);
        const minorLength = this.mmToPt(2);

        const maxWidth = this.pageWidth - this.minOffset * 2;
        const maxScale = Math.floor(maxWidth / (pitchPt * 10)) * 10 * pitchPt
        const offsetX = Math.floor((this.pageWidth - maxScale) / 2);

        let w = 0;
        let m = 0;
        let mc = 0;
        let sm = 0;
        const labelSize = 8;
        const drawOp = { size: labelSize };
        const charHeight = this.font.sizeAtHeight(labelSize);

        // horizontal, upper
        this.addLine(
            offsetX, this.pageHeight - y,
            offsetX + maxScale, this.pageHeight - y,
            th, black, butt
        );

        while (w <= maxScale + 1) {
            this.addLine(
                offsetX + w, this.pageHeight - y,
                offsetX + w, this.pageHeight - y - (m == 0 ? majorLength : (sm == 0 ? subMajorLength : minorLength)),
                th, black, butt
            );
            if (m == 0) {
                const label = (mc * 10).toString();
                const labelWidth = this.font.widthOfTextAtSize(label, labelSize);
                this.addText(
                    label,
                    offsetX + w - labelWidth / 2,
                    this.pageHeight - y - majorLength - charHeight - 2.,
                    drawOp
                );
            }

            w += pitchPt;
            m += 1;
            if (m >= 10) {
                m = 0;
                mc += 1;
            }
            sm += 1;
            if (sm >= 5) {
                sm = 0;
            }
        }

        // count
        drawOp.size = labelSize - 1.;
        this.page.moveTo(offsetX + 10, this.pageHeight - y - 32);
        this.page.drawText(count.toString() + ' count, ' + par10.toString() + '/10 cm', drawOp);
    }

    addText(s, x, y, drawOp) {
        this.page.moveTo(x, y);
        this.page.drawText(s, drawOp);
    }

    addLine(startX, startY, endX, endY, thickness, color, lineCap) {
        this.page.drawLine({
            start: { x: startX, y: startY },
            end: { x: endX, y: endY },
            thickness: thickness,
            color: color,
            lineCap: lineCap,
        });
    }

    output = (callback) => {
        this.doc.save().then((data) => {
            callback(data);
        });
    }
}

const paperSize = ["A4", "A3", "B5", "B4"];

class UI {
    constructor() {
    }

    addOption(parent, s, id) {
        const option = document.createElement('option');
        option.innerText = s;
        if (id) {
            option.setAttribute('id', id);
        }
        parent.appendChild(option);
    }

    fillCount() {
        const counts = document.getElementById('counts');
        for (const entry of countsList) {
            this.addOption(counts, entry[0] + ' / ' + entry[1]);
        }
        counts.selectedIndex = 4; // daiso
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

    isLandscape() {
        return document.getElementById('landscape').checked;
    }

    getPaperSizeArray() {
        const size = this.getPaperSize();
        const sizeArray = PDFLib.PageSizes[size];
        return [sizeArray[1], sizeArray[0]];
    }

    getPitch() {
        const pitches = document.getElementById('counts');
        return countsList[pitches.selectedIndex];
    }

    getCorrection() {
        return document.getElementById('correction').value;
    }

    init() {
        this.fillCount();
        this.addPaperSize();
    }
}

window.onload = function() {
    const ui = new UI();
    ui.init();

    function generate() {
        const fabric = ui.getPitch();
        const pitch = 100. / fabric[1];
        new ScaleMaker(
            { count: fabric[0], par10: fabric[1],
              pitch: pitch, pageSize: ui.getPaperSizeArray(),
              correction: ui.getCorrection(), }, (pw) => {

            const pdf = document.getElementById('pdf');

            pw.output((a) => {
                const f = new File([a], "scale.pdf", {type: "application/pdf"});
                const url = URL.createObjectURL(f);
                pdf.data = url;
            });
        });
    }

    document.getElementById('counts').addEventListener('change', generate);
    document.getElementById('paper-size').addEventListener('change', generate);

    generate();
}
