
import { TT } from './jp.js';

function getOrDefault(obj, name, defaultValue) {
    const value = obj[name];
    return value === undefined ? defaultValue : value;
}

export class PDFWriter {
    constructor(options, callback) {
        this.paperSizeList = {
            A4: PDFLib.PageSizes.A4,
            A3: PDFLib.PageSizes.A3,
            B5: PDFLib.PageSizes.B5,
            B4: PDFLib.PageSizes.B4,
            Postcard: [283.46, 419.53],
        };
        this.mmToPtCoef = 72. / 25.4;

        this.colorBlack = PDFLib.rgb(0., 0., 0.);
        this.colorWhite = PDFLib.rgb(1., 1., 1.);
        const paperSize = getOrDefault(options, 'paperSize', 'A4');
        const landscape = getOrDefault(options, 'landscape', false);
        this.colorMode = getOrDefault(options, 'color_mode', 'color');
        this.gridSize = this.mmToPt(3.);
        this.labelSize = this.mmToPt(2.3);
        this.outerLineWidth = this.mmToPt(0.2);
        this.gridLineWidth = this.mmToPt(0.1);
        this.gridMajorLineWidth = this.mmToPt(0.1);
        this.landscape = landscape;
        this.paperSize = paperSize;
        const sizeInfo = this.paperSizeList[paperSize];
        if (this.landscape) {
            this.pageSizeInfo = [sizeInfo[1], sizeInfo[0]];
        } else {
            this.pageSizeInfo = sizeInfo;
        }

        this.offsetX = this.mmToPt(15);
        this.offsetY = this.mmToPt(13.5);

        this.charSize = 12.;
        this.cellWidth = this.mmToPt(18.);
        this.tableOffsetX = (this.pageWidth - 10 * this.cellWidth) / 2;
        this.colorSep = 2.;
        this.copyrightCharSize = 6.;

        // Used only in the information pages.
        this.currentY = 0;

        this.pageLocationWidth = this.mmToPt(10);
        this.pageLocationHeight = this.mmToPt(14);
        if (options.isJP) {
            this.labels = {
                number: TT['Number'], rgb: TT['RGB'], code: TT['Code'], count: TT['Count'], color: TT['Color'],
            };
        } else {
            this.labels = {
                number: 'Number', rgb: 'RGB', code: 'Code', count: 'Count', color: 'Color',
            };
        }
        this.options = options;

        PDFLib.PDFDocument.create().then(async (doc) => {;
            this.doc = doc;
            this.doc.registerFontkit(fontkit);
            this.helveticaFont = await this.doc.embedFont(PDFLib.StandardFonts.Helvetica);
            this.font = this.helveticaFont;

            const url = "./assets/font/mplus-2m-regular.ttf";
            const fontBytes = await fetch(url).then(res => res.arrayBuffer());
            this.MpFont = await this.doc.embedFont(fontBytes, { subset: true });

            this.page = null;
            this.rgb = PDFLib.rgb;
            this.lineCapStyle = PDFLib.LineCapStyle;

            this.doc.setCreator("Cross-stitch pattern maker");

            if (options.title) {
                this.doc.setTitle(options.title);
            }
            if (options.author) {
                this.doc.setAuthor(options.author);
            }

            this.copyright = options.copyright;
            this.copyrightLineCount = this.parseCopyright(options.copyright);

            const sizeInfo = this.paperSizeList[this.paperSize];
            this.calculatesCellsPerPage(sizeInfo);

            callback(this);
        });
    }

    mmToPt = (v) => {
        return v * this.mmToPtCoef;
    }

    hexToRGB = (v) => {
        const color = parseInt(v, 16);
        const r = (color & 0xff0000) >> 16;
        const g = (color & 0xff00) >> 8;
        const b = color & 0xff;
        return this.rgb(r / 255, g / 255, b / 255);
    }

    rgbToGrayscale = (r, g, b) => {
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    calculatesCellsPerPage(sizeInfo) {
        // calculate height of copyright
        const copyrightLineHeight = Math.ceil(this.font.heightAtSize(this.copyrightCharSize) * 1.05);
        const copyrightHeight = this.copyrightLineCount * copyrightLineHeight;

        const width = this.landscape ? sizeInfo[1] : sizeInfo[0];
        const height = (this.landscape ? sizeInfo[0] : sizeInfo[1]) - copyrightHeight;
        const horiCount = Math.floor(((width - this.offsetX * 2) / this.gridSize) / 10) * 10;
        const vertCount = Math.floor(((height - this.offsetY * 2) / this.gridSize) / 10) * 10;
        this.widthPerPage = horiCount;
        this.heightPerPage = vertCount;
    }

    splitTextToSpan(s) {
        if (s.length == 0) {
            return [];
        }
        const spanList = [];
        let totalLength = s.length;
        let start = 0;
        let len = 0;
        let winAnsi = s.charCodeAt(0) <= 255;
        while (start + len < totalLength) {
            const code = s.charCodeAt(start + len);
            const isWinAnsi = 0 <= code && code <= 255;
            if (winAnsi == isWinAnsi) {
                len += 1;
                continue;
            }
            const span = s.substring(start, start + len);
            spanList.push({start: start, len: len, font: !isWinAnsi ? this.helveticaFont : this.MpFont});
            winAnsi = isWinAnsi;
            start = start + len;
            len = 0;
        }

        spanList.push({start: start, len: len, font: winAnsi ? this.helveticaFont : this.MpFont});
        return spanList;
    }

    parseCopyright(copyright) {
        const copyrightLines = [];
        this.copyrightLines = copyrightLines;
        const lines = copyright.split('\n');
        if (copyright.length > 0 && lines.length > 0) {
            let lineCount = 0;
            const lineWidth = this.pageSizeInfo[0] - this.offsetX * 2;
            for (const line of lines) {
                const spans = this.splitTextToSpan(line);
                copyrightLines.push(spans);
                let width = 0;
                for (const span of spans) {
                    width += span.font.widthOfTextAtSize(line.substring(span.start, span.start + span.len), this.copyrightCharSize);
                }

                if (width > lineWidth) {
                    lineCount += Math.ceil(width / lineWidth);
                } else {
                    lineCount += 1;
                }
            }
            return lineCount;
        } else {
            return 0;
        }
    }

    startInformationPage() {
        this.page = this.doc.addPage(this.pageSizeInfo);
        this.page.setFont(this.helveticaFont);
        const size = this.page.getSize();
        this.pageWidth = size.Width;
        this.pageHeight = size.height;

        this.charHeight = this.font.sizeAtHeight(this.charSize);
        this.cellHeight = this.charHeight * 1.2;
        this.informationCount = 0;
        this.currentY = this.pageHeight - this.offsetY;
    }

    endInformationPage() {
        this.informationCount = 0;
    }

    addPageLocation(width, height) {
        const charSize = 14;
        if (this.currentY + height * this.pageLocationHeight < this.offsetY) {
            this.startInformationPage();
        }

        const halfHeight = this.font.heightAtSize(charSize);
        let page = 1;
        let posY = this.currentY - this.pageLocationHeight;
        let posX = this.offsetX;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                this.page.drawRectangle({
                    x: posX,
                    y: posY,
                    width: this.pageLocationWidth,
                    height: this.pageLocationHeight,
                    borderWidth: 1,
                    borderColor: this.rgb(0, 0, 0),
                });

                let pageString = page.toString();
                const width = this.font.widthOfTextAtSize(pageString, charSize);
                this.page.moveTo(posX - width / 2 + this.pageLocationWidth / 2, posY + halfHeight);
                this.page.drawText(pageString, { size: charSize });
                page += 1;
                posX += this.pageLocationWidth;
            }
            posX = this.offsetX;
            posY -= this.pageLocationHeight;
        }
    }

    colorInPage() {
        const charSize = 12.;
        const cellWidth = this.mmToPt(15.);
        const charHeight = this.font.sizeAtHeight(charSize);
        const cellHeight = charHeight * 1.2;
        return Math.floor((this.pageHeight - this.offsetY * 2) / (cellHeight * 5)) * 10;
    }

    addColors(colors) {
        this.startInformationPage();

        const parPage = this.colorInPage();
        const omitColors = [];
        let remainedColors = colors.length;
        let added = 0;
        for (const color of colors) {
            if (color.labeled) {
                added += this.addColor(color.id, color.color, color.name, color.count);
            } else {
                omitColors.push(color);
            }
            if (added >= parPage) {
                this.endInformationPage();
                if (remainedColors > 0 || omitColors.length > 0) {
                    this.startInformationPage();
                }
                added = 0;
            }
        }

        for (let i = 0; i < omitColors.length; i++) {
            const color = omitColors[i];
            added += this.addColor(color.id, color.color, color.name, color.count);
            if (added >= parPage) {
                this.endInformationPage();
                if (i <= omitColors.length - 1) {
                    this.startInformationPage();
                }
                added = 0;
            }
        }

        this.endInformationPage();
    }

    addColor(id, color, name, count, label=false, colorLabel=null) {
        let font = this.helveticaFont;
        if (label && this.options.isJP) {
            font = this.MpFont;
        }
        this.font = font;
        const drawOp = {
            size: this.charSize - (label ? 2 : 0),
            font: font,
        };
        if (!label && (this.informationCount % 10) == 0) {
            this.addColor(this.labels.number, this.labels.rgb, this.labels.code, this.labels.count, true, this.labels.color);
        }

        const x = this.offsetX + (this.informationCount % 10) * this.cellWidth + this.colorSep;
        const rows = Math.floor(this.informationCount / 10);
        let y = this.pageHeight - this.offsetY - (Math.floor(this.informationCount / 10) + 1) * this.cellHeight;
        if (rows > 0) {
            y -= rows * this.cellHeight * 4;
        }

        if (!id.startsWith('omit')) {
            this.page.moveTo(this.centeringText(x, this.cellWidth, id.toString(), this.charSize), y);
            this.page.drawText(id.toString(), drawOp);
        }

        y -= this.cellHeight;
        const rgb = this.hexToRGB(color);

        const options = {
            x: x,
            y: y,
            width: this.cellWidth - this.colorSep * 2,
            height: this.charHeight,
            color: rgb,
        };
        if (rgb.red > 0.95 && rgb.green > 0.95 && rgb.blue > 0.95) {
            options.borderColor = this.rgb(0, 0, 0);
            options.borderOpacity = 1.;
            options.borderWidth = 1.;
        }
        if (this.colorMode == 'grayscale') {
            const d = this.rgbToGrayscale(rgb.red * 255, rgb.green * 255, rgb.blue * 255);
            options.color = this.rgb(d / 255, d / 255, d / 255);
        }
        if (!label) {
            this.page.drawRectangle(options);
        } else {
            this.page.moveTo(this.centeringText(x, this.cellWidth, colorLabel, this.charSize), y);
            this.page.drawText(colorLabel, drawOp);
        }

        y -= this.cellHeight;
        this.page.moveTo(this.centeringText(x, this.cellWidth, name, this.charSize), y);
        this.page.drawText(name, drawOp);

        y -= this.cellHeight;
        this.page.moveTo(this.centeringText(x, this.cellWidth, count.toString(), this.charSize), y);
        this.page.drawText(count.toString(), drawOp);

        y -= this.cellHeight;
        drawOp.size = this.charSize - (label ? 2 : 3.);
        drawOp.font = this.helveticaFont;
        const colorValue = label ? color : ('#' + color);
        this.page.moveTo(this.centeringText(x, this.cellWidth, colorValue, this.charSize - (label ? 0 : 3.)), y);
        this.page.drawText(colorValue, drawOp);

        this.currentY = y - this.cellHeight;

        this.informationCount += 1;

        return label ? 2 : 1;
    }

    centeringText(x, width, s, size) {
        const textWidth = this.font.widthOfTextAtSize(s, size);
        return x + (width - textWidth) / 2;
    }

    startPage(pageNumber, x, y, width, height) {
        this.page = this.doc.addPage(this.pageSizeInfo);
        this.page.setFont(this.helveticaFont);
        const size = this.page.getSize();
        this.pageWidth = size.width;
        this.pageHeight = size.height;

        this.pageOriginX = x;
        this.pageOriginY = y;

        // page number
        const pageNumberSize = 12.;
        const numberY = this.mmToPt(6.);
        const numberX = this.mmToPt(30.);
        if (pageNumber) {
            const s = pageNumber.toString();
            const textWidth = this.font.widthOfTextAtSize(s, pageNumberSize);
            this.page.moveTo(numberX - textWidth, numberY);
            this.page.drawText(s, { size: pageNumberSize });
        }
    }

    endPage(x, y, width, height) {
        this.addGrid(x, y, width, height);
        this.addOuter(x, y, width, height);
        this.addCopyright(x, y, width, height);
    }

    addCell(x, y, r, g, b, id, labeled, isBlack) {
        if (this.colorMode == 'color' || this.colorMode == 'grayscale') {
            const options = {
                x: this.offsetX + (x - this.pageOriginX) * this.gridSize,
                y: this.pageHeight - this.offsetY - (y - this.pageOriginY + 1) * this.gridSize + this.gridLineWidth,
                width: this.gridSize - this.gridLineWidth,
                height: this.gridSize - this.gridLineWidth,
                color: this.rgb(r / 255, g / 255, b / 255),
            };
            if (this.colorMode == 'grayscale') {
                const d = this.rgbToGrayscale(r, g, b);
                options.color = this.rgb(d / 255, d / 255, d / 255);
            }
            this.page.drawRectangle(options);
        }
        if (labeled) {
            const textWidth = this.font.widthOfTextAtSize(id, this.labelSize);
            const offsetX = (this.gridSize - this.gridLineWidth - textWidth) / 2;
            const offsetY = 2.;
            this.page.moveTo(
                this.offsetX + (x - this.pageOriginX) * this.gridSize + offsetX,
                this.pageHeight - this.offsetY - (y - this.pageOriginY + 1) * this.gridSize + offsetY);
            this.page.drawText(id, { size: this.labelSize,
                color: (!isBlack || this.colorMode == 'no-color') ? this.colorBlack : this.colorWhite,
            });
        }
    }

    addGrid(x, y, width, height) {
        const lineColor = this.rgb(0.75, 0.75, 0.75);
        const subMajorLineColor = this.rgb(0.5, 0.5, 0.5);
        let startX = this.offsetX;
        let endX = startX + width * this.gridSize;
        let startY = this.pageHeight - this.offsetY;// - this.gridLineWidth / 2;
        let n = -1;
        // horizontal
        let cy = this.pageHeight - this.offsetY + this.gridLineWidth / 2;;
        for (let hc = 0; hc < height; hc++) {
            this.addLine(startX, cy, endX, cy, this.gridLineWidth, n != 4 ? lineColor : subMajorLineColor, this.lineCapStyle.Butt);
            cy -= this.gridSize;
            n += 1;
            if (n >= 5) {
                n = 0;
            }
        }
        n = -1;
        // vertical
        let endY = startY - height * this.gridSize - this.gridLineWidth / 2;
        let cx = this.offsetX - this.gridLineWidth / 2;
        for (let vc = 0; vc < width; vc++) {
            this.addLine(cx, startY, cx, endY, this.gridLineWidth, n != 4 ? lineColor : subMajorLineColor, this.lineCapStyle.Butt);
            cx += this.gridSize;
            n += 1;
            if (n >= 5) {
                n = 0;
            }
        }

        // major lines
        // horizontal
        const lineMajorColor = this.rgb(0.25, 0.25, 0.25);
        cy = startY - this.gridSize * 10;
        for (let hc = 1; hc <= height / 10; hc++) {
            this.addLine(startX, cy, endX, cy, this.gridMajorLineWidth, lineMajorColor, this.lineCapStyle.Butt);
            cy -= this.gridSize * 10;
        }
        // vertical
        cx = this.offsetX - this.gridMajorLineWidth / 2;
        for (let vc = 0; vc <= width / 10; vc++) {
            this.addLine(cx, startY, cx, endY, this.gridMajorLineWidth, lineMajorColor, this.lineCapStyle.Butt);
            cx += this.gridSize * 10;
        }
    }

    addOuter(x, y, width, height) {
        const lineColor = this.rgb(0, 0, 0);
        const cap = this.lineCapStyle.Projecting;
        const halfLineWidth = this.outerLineWidth / 2;
        // horizontal
        let startX = this.offsetX - halfLineWidth;
        let endX = startX + width * this.gridSize + halfLineWidth;
        let lineY = this.pageHeight - this.offsetY + halfLineWidth;
        this.addLine(startX, lineY, endX, lineY, this.outerLineWidth, lineColor, cap);
        lineY -= height * this.gridSize + halfLineWidth;
        this.addLine(startX, lineY, endX, lineY, this.outerLineWidth, lineColor, cap);
        // vertical
        let startY = this.pageHeight - this.offsetY + halfLineWidth;
        let endY = startY - height * this.gridSize - halfLineWidth;
        let lineX = this.offsetX - halfLineWidth;
        this.addLine(lineX, startY, lineX, endY, this.outerLineWidth, lineColor, cap);
        lineX += width * this.gridSize + halfLineWidth;
        this.addLine(lineX, startY, lineX, endY, this.outerLineWidth, lineColor, cap);

        const font = this.font;
        this.page.setFont(font);
        const labelSize = 10;
        const drawOp = { size: labelSize };
        const sep = this.mmToPt(1.0);
        const charHeight = font.sizeAtHeight(labelSize);

        let cy = startY - this.gridSize * 10;
        for (let hc = 1; hc <= height / 10; hc++) {
            const s = (hc * 10 + y).toString();
            const textWidth = font.widthOfTextAtSize(s, labelSize);
            this.page.moveTo(this.offsetX - textWidth - sep, cy);
            this.page.drawText(s, drawOp);

            // rigth side
            this.page.moveTo(this.offsetX + width * this.gridSize + sep, cy);
            this.page.drawText(s, drawOp);

            cy -= this.gridSize * 10;
        }
        const ypos = startY + sep;
        let cx = startX;
        for (let vc = 0; vc <= width / 10; vc++) {
            const s = (vc * 10 + x).toString();
            const textWidth = font.widthOfTextAtSize(s, labelSize);
            this.page.moveTo(cx - textWidth, ypos);
            this.page.drawText(s, drawOp);

            // bottom
            this.page.moveTo(cx - textWidth, this.pageHeight - this.offsetY - height * this.gridSize - charHeight - 3.);
            this.page.drawText(s, drawOp);

            cx += this.gridSize * 10;
        }
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

    addCopyright(x, y, width, height) {
        const copyrightLineHeight = Math.ceil(this.font.heightAtSize(this.copyrightCharSize) * 1.05);
        const charHeight = this.font.sizeAtHeight(10.);
        const pageWidth = this.pageSizeInfo[0];
        const pageHeight = this.pageSizeInfo[1];
        const lines = this.copyright.split("\n");
        let currentY = height * this.gridSize + charHeight * 3 + 3.;
        const drawOp = { size: this.copyrightCharSize };
        let n = 0;
        for (const spansLine of this.copyrightLines) {
            const line = lines[n];
            const lineWidth = this.calculateLineWidth(line, spansLine);
            let currentX = pageWidth - this.offsetX - lineWidth;
            for (const span of spansLine) {
                this.page.moveTo(currentX, pageHeight - currentY - this.offsetY);
                drawOp.font = span.font;
                this.page.drawText(line.substring(span.start, span.start + span.len), drawOp)
                currentX += span.width
            }
            currentY += copyrightLineHeight;
            n += 1;
        }
    }

    calculateLineWidth(s, spans) {
        let width = 0;
        for (const span of spans) {
            const thisWidth = span.font.widthOfTextAtSize(s.substring(span.start, span.start + span.len), this.copyrightCharSize);
            span.width = thisWidth;
            width += thisWidth;
        }
        return width;
    }

    output = (callback) => {
        this.doc.save().then((data) => {
            callback(data);
        });
    }
}
