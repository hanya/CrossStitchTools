
export const script = `
const ja_TT = {
    "Show this color number only": "この色番号のみ表示",
    "Show all color numbers": "すべての色番号を表示",
    "Hide all color numbers": "すべての色番号を隠す",
    "Show this color number": "この色番号を表示",
    "Hide this color number": "この色番号を隠す",
    "Show all": "全表示",
    "Hide all": "全非表示",
    "Info.": "情報",
};

function resizeContextmenuEntries() {
    // update size of entries in the context menu
    let count = 0;
    const parent = document.getElementById('contextmenu-entries');
    let maxWidth = 0;
    let maxHeight = 0;
    for (const node of parent.childNodes) {
        if (node.tagName == 'text') {
            const box = node.getBBox();
            maxWidth = Math.max(box.width, maxWidth);
            maxHeight = Math.max(box.height, maxHeight);
            count += 1;
        }
    }
    maxWidth = Math.ceil(maxWidth);
    const elementHeight = Math.ceil(maxHeight * 1.3);
    let y = 1;
    for (const node of parent.childNodes) {
        if (node.tagName == 'rect') {
            node.setAttribute('x', 0);
            node.setAttribute('y', y);
            node.setAttribute('width', maxWidth + 10);
            node.setAttribute('height', elementHeight);
            const label = document.getElementById(node.id + '-label');
            if (label) {
                label.setAttribute('x', 5);
                label.setAttribute('y', y + 16);
            }
            y += elementHeight;
        }
    }

    const outer = document.getElementById('menu-outer')
    outer.setAttribute('width', 5 + maxWidth + 5);
    outer.setAttribute('height', elementHeight * count + 2);
}

function translateTextContent(dic, tagName) {
    const textList = document.getElementsByTagName(tagName);
    for (const text of textList) {
        const s = text.textContent;
        const ts = dic[s];
        if (ts) {
            text.textContent = ts;
        }
    }
}

function clearChildren(id) {
    const parent = document.getElementById(id);
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function parseQueries() {
    const qs = window.location.search.slice(1);
    qs.split('&').forEach((q) => {

    });
}

window.onload = function () {
    const data = JSON.parse(document.getElementById('data').textContent).data;
    const info = JSON.parse(document.getElementById('info').textContent);
    const gridSize = info.gridSize;
    const offset = info.offset;
    const width = info.width;
    const height = info.height;

    let showInfo = false;
    const infoRect = document.getElementById('info-rect');
    let currentX = -1;
    let currentY = -1;
    let menuX = -1;
    let menuY = -1;
    const menu = document.getElementById('contextmenu');
    const menuEntries = [
        'show-all', 'hide-all',
        'show-this-only', 'show-this', 'hide-this',
    ];

    if (document.firstElementChild.tagName == 'HTML') {
        clearChildren('color-number');
        function addOption(parent, text) {
            const option = document.createElement('option');
            option.textContent = text
            parent.appendChild(option);
        }

        const colorList = document.getElementById('color-number');
        addOption(colorList, 'Show all');
        for (const color of info.colors) {
            addOption(colorList, color[0] + ' - ' + color[2]);
        }
        addOption(colorList, 'Hide all');
    }

    if (navigator.language.substring(0, 2) == 'ja') {
        translateTextContent(ja_TT, 'text');
        translateTextContent(ja_TT, 'option');
        const inputList = document.getElementsByTagName('input');
        for (const input of inputList) {
            const v = input.value;
            const vs = ja_TT[v];
            if (vs) {
                input.value = vs;
            }
        }
    }

    resizeContextmenuEntries();

    function setAllNumberingVisibility(visibility) {
        const state = visibility ? 'visible' : 'hidden';
        const labels = document.getElementById('labels');
        for (const node of labels.childNodes) {
            if (node.tagName == 'g') {
                node.setAttribute('visibility', state);
              }
          }
    }

    function setNumberingVisibility(id, visibility) {
        const state = visibility ? 'visible' : 'hidden';
        const labels = document.getElementById(id + '-labels');
        labels.setAttribute('visibility', state);
    }

    function runCommand(cmd) {
        switch (cmd) {
            case 'show-this-only': {
                const color = getColor(menuX, menuY);
                if (!color) {
                    return;
                }
                setAllNumberingVisibility(false);
                setNumberingVisibility(color[0], true);
                break;
            }
            case 'show-this': {
                const color = getColor(menuX, menuY);
                if (!color) {
                    return;
                }
                setNumberingVisibility(color[0], true);
                break;
            }
            case 'hide-this': {
                const color = getColor(menuX, menuY);
                if (!color) {
                    return;
                }
                setNumberingVisibility(color[0], false);
                break;
            }
            case 'show-all': {
                setAllNumberingVisibility(true);
                break;
            }
            case 'hide-all': {
                setAllNumberingVisibility(false);
                break;
            }
            default: {
                if (cmd && cmd.startsWith('show-this-')) {
                    const index = parseInt(cmd.substring(10), 10);
                    setAllNumberingVisibility(false);
                    setNumberingVisibility(info.colors[index][0], true);
                }
            }
        }
    }

    function contextClick(ev) {
        let target = null;
        if (ev.target.tagName == 'text') {
            target = document.getElementById(ev.target.id.replace('-label', ''));
        } else {
            target = ev.target;
        }
        runCommand(target.id);
        ev.preventDefault();
        return false;
    }

    for (const entry of menuEntries) {
        const obj = document.getElementById(entry);
        if (obj) {
            obj.addEventListener('click', contextClick, false);
            const label = document.getElementById(entry + '-label');
            if (label) {
                label.addEventListener('click', contextClick, false);
            }
        }
    }

    const mouseMoveListener = function (ev) {
        const x = Math.floor((ev.offsetX - offset) / gridSize);
        const y = Math.floor((ev.offsetY - offset) / gridSize);
        if (x != currentX || y != currentY) {
            currentX = x;
            currentY = y;
            if (x >= 0 && y >= 0 && x <= width && y <= height) {
                if (showInfo) {
                    locateInfo();
                    updateInfo();
                }
            }
        }
    };

    function setInfoVisible(vis) {
        showInfo = vis;
        if (vis) {
            document.addEventListener('mousemove', mouseMoveListener);
        } else {
            document.removeEventListener('mousemove', mouseMoveListener);
        }
        if (menu.getAttribute('visibility') == 'visible') {
            menu.setAttribute('visibility', 'hidden');
        }
        showInfoRect(showInfo);
    }

    let mouseTarget = null;

    if (document.firstElementChild.tagName == 'HTML') {
        document.getElementById('color-number').addEventListener('change', function(ev) {
            const index = ev.target.selectedIndex;
            if (index == 0) {
                runCommand('show-all');
            } else if (index <= info.colors.length) {
                runCommand('show-this-' + (index - 1));
            } else if (index == info.colors.length + 1) {
                runCommand('hide-all');
            }
        });

        mouseTarget = document.getElementById('svg-data');
        document.getElementById('info-button').addEventListener('click', function (ev) {
            showInfo = !showInfo;
            locateInfo();
            updateInfo();
            setInfoVisible(showInfo);
        });
    } else {
        mouseTarget = document;
        document.addEventListener('contextmenu', function (ev) {
            setInfoVisible(false);
            let [x, y] = [ev.offsetX, ev.offsetY];
            [menuX, menuY] = toCoordinate(x, y);

            if (menu.getAttribute('visibility') == 'visible') {
                menu.setAttribute('visibility', 'hidden');
            } else {
                if (x > (offset + gridSize * width - 200)) {
                    x = offset + gridSize * width - 200;
                }
                if (y > (offset + gridSize * height - 88)) {
                    y = offset + gridSize * height - 88;
                }
                menu.setAttribute('transform', 'translate(' + x.toString() + ', ' + y.toString() + ')');
                menu.setAttribute('visibility', 'visible');
            }
            ev.preventDefault();
            return false;
        }, false);

        mouseTarget.addEventListener('click', function (ev) {
            showInfo = !showInfo;
            locateInfo();
            updateInfo();
            setInfoVisible(showInfo);
        });

        function onMouseEnter(ev) {
            let target = null;
            if (ev.target.id.endsWith('-label')) {
                target = document.getElementById(ev.target.id.replace('-label', ''));
            } else {
                target = ev.target;
            }
            if (target) {
                const targetId = target.id;
                for (const node of ev.target.parentNode.childNodes) {
                    if (node.tagName == 'rect') {
                        if (node.id == targetId) {
                            node.setAttribute('style', 'fill: red;');
                        } else {
                            node.setAttribute('style', 'fill: white;');
                        }
                    }
                }
            }
        }

        function onMouseLeave(ev) {
            for (const node of document.getElementById('contextmenu-entries').childNodes) {
                if (node.tagName == 'rect') {
                    node.setAttribute('style', 'fill: white;');
                }
            }
        }

        {
            const parent = document.getElementById('contextmenu-entries');
            for (const entry of parent.childNodes) {
                entry.addEventListener('mouseenter', onMouseEnter);
            }
            document.getElementById('menu-outer').addEventListener('mouseleave', onMouseLeave);
        }
    }

    function toCoordinate(posX, posY) {
        const x = Math.floor((posX - offset) / gridSize);
        const y = Math.floor((posY - offset) / gridSize);
        return [x, y];
    }

    function locateInfo() {
        const localOffset = 4;
        let x = offset + (currentX + localOffset) * gridSize;
        let y = offset + (currentY + localOffset) * gridSize;
        // relocate information box
        if (currentX + 12 > width) {
            x -= 14 * gridSize;
        }
        if (currentY + 10 > height) {
            y -= 14 * gridSize;
        }
        infoRect.setAttribute('transform', 'translate(' + x.toString() + ' ' + y.toString() + ')');
    }

    function countCells(stepX, stepY) {
        if ((stepX < 0 && currentX <= 0) || (stepX > 0 && currentX >= width)) {
            return 0;
        }
        if ((stepY < 0 && currentY <= 0) || (stepY > 0 && currentY >= height)) {
            return 0;
        }
        const c = data[currentY][currentX];
        let x = currentX + stepX;
        let y = currentY + stepY;
        let n = 0;
        while ((0 <= x && x < width) && (0 <= y && y < height) && data[y][x] == c) {
            x += stepX;
            y += stepY;
            n += 1;
        }
        return n;
    }

    function getColor(x, y) {
        const row = data[y];
        if (!row) {
            return null;
        }
        const colorNumber = row[x];
        const color = info.colors[colorNumber];
        if (!color) {
            return null;
        }
        return color;
    }

    function updateInfo() {
        const color = getColor(currentX, currentY);
        if (!color) {
            return;
        }
        setColor('current-color', color[1]);
        setText('color-id', color[0]);
        setText('color-name', color[2]);
        setText('left', countCells(-1, 0));
        setText('right', countCells(1, 0));
        setText('up', countCells(0, -1));
        setText('down', countCells(0, 1));
        setText('coord-x', 'x: ' + (currentX + 1).toString());
        setText('coord-y', 'y: ' + (currentY + 1).toString());
    }

    function showInfoRect(state) {
        infoRect.setAttribute('visibility', state ? 'visible' : 'hidden');
    }

    function setText(id, s) {
        document.getElementById(id).textContent = s;
    }

    function setColor(id, color) {
        document.getElementById(id).setAttribute('style', 'fill: #' + color);
    }
}
`;

import { TT } from './jp.js';

export class SVGWriter {
    constructor(offsetX, offsetY, width, height, useLink, gridSize, forPrinting, options) {
        this.forPrinting = forPrinting;
        if (forPrinting) {
            this.outerLineWidth = 0.4;
            this.gridLineWidth = 0.1;
            this.offset = 10.0;
        } else {
            this.outerLineWidth = 2;
            this.gridLineWidth = 1;
            this.offset = 35;
        }

        this.gridSize = gridSize;
        this.width = width;
        this.height = height;
        this.gridInnerWidth = width * gridSize;
        this.gridInnerHeight = height * gridSize;
        this.gridOriginX = this.offset;
        this.gridOriginY = this.offset;

        this.imageWidth = this.offset * 2 + this.gridInnerWidth + 1.0;
        this.imageHeight = this.offset * 2 + this.gridInnerHeight + 1.0;
        if (options.copyright) {
            this.parseCopyright(options.copyright);
            this.imageHeight += this.copyrightLineCount * 14;
        }
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
        const tableSize = this.calculateColorTableSize(options.colorCount);
        this.imageHeight += tableSize[1];

        this.dom = this._createDom(
            this.outerLineWidth, this.outerLineWidth,
            this.imageWidth > tableSize[0] ? this.imageWidth : tableSize[0],
            this.imageHeight, useLink);

        this.cells = this.addGraphic('cells', this.dom);
        this.cellLabels = this.addGraphic('labels', this.dom);
        this.labelsNodes = new Map();
        this.cellDefIndices = new Map();
        this.cellDefInfo = new Map();
        this.addGrid();
        this.addOuter();

        // data array
        const a = [];
        for (let y = 0; y < height; y++) {
            const r = [];
            for (let x = 0; x < width; x++) {
                r.push(0);
            }
            a.push(r);
        }
        this.cellData = a;
        this.bottomY = this.imageHeight;

        if (options.title) {
            const desc = this.createElement('title');
            desc.textContent = options.title;
            this.dom.appendChild(desc);
        }
        if (options.copyright) {
            this.addCopyright(options.copyright);
        }
    }

    addCopyright(copyright) {
        const lines = copyright.split('\n');
        let y = this.offset + this.gridInnerHeight + 30;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const copyrightLine = this.copyrightLines[i];
            for (const span of copyrightLine) {
                const s = line.substring(span.start, span.end);
                this.addText(this.dom, this.offset, y, s, 'left', '8pt', '', '');
                y += 14;
            }
        }
        this.bottomY = y;
    }

    parseCopyright(copyright) {
        const div = document.getElementById('text-width');
        div.style.width = this.gridInnerWidth + 'px';
        const node = div.firstChild;

        const copyrightLines = [];
        let y = this.offset + this.gridInnerHeight + 35;
        for (const line of copyright.split('\n')) {
            if (line.length <= 0) {
                break;
            }
            const ranges = [];
            let start = 0;
            let prevRect = null;
            for (let i = 1; i < line.length + 1; i++) {
                div.textContent = line.substring(0, i);
                const range = document.createRange();
                range.selectNodeContents(div);
                const rect = range.getBoundingClientRect();
                if (prevRect && prevRect.height < rect.height) {
                    let end = i - 1;
                    // find space or other character to split line
                    let n = i - 1;
                    while (n > 0) {
                        const c = line.charCodeAt(n);
                        if ((0x41 <= c && 0x5A <= c) ||
                            (0x61 <= c && 0x7A <= c) ||
                            (0x30 <= c && 0x39 <= c)) {
                            n -= 1;
                        } else {
                            end = n;
                            break;
                        }
                    }
                    ranges.push({ start: start, end: end });
                    start = end;
                } else {
                }
                prevRect = rect;
            }
            ranges.push({ start: start, end: line.length });
            copyrightLines.push(ranges);
        }
        this.copyrightLines = copyrightLines;
        let count = 0;
        for (const line of copyrightLines) {
            count += line.length;
        }
        this.copyrightLineCount = count;
        div.textContent = '';
    }

    createElement(tagName) {
        return document.createElementNS('http://www.w3.org/2000/svg', tagName);
    }

    addCell(x, y, target, labeled, isBlack) {
        const realX = this.gridOriginX + x * this.gridSize;
        const realY = this.gridOriginY + y * this.gridSize;
        this.addUse(this.cells, target, realX, realY);

        const labelsTarget = target + '-labels';
        let parent = this.labelsNodes.get(labelsTarget);
        if (parent == null) {
            parent = this.createElement('g');
            parent.setAttribute('id', labelsTarget);
            this.cellLabels.append(parent);
            this.labelsNodes.set(labelsTarget, parent);
        }
        this.addUse(parent, target + '-label', realX, realY);

        const index = this.cellDefIndices.get(target);
        if (index) {
            this.cellData[y][x] = index;
        }
    }

    addCellDef(color, id, name, is_black, count) {
        const width = this.gridSize - (this.forPrinting ? this.gridLineWidth : 0);
        const height = this.gridSize - (this.forPrinting ? this.gridLineWidth : 0);
        const rect = this.createElement('rect');
        rect.setAttribute('x', 0);
        rect.setAttribute('y', 0);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        rect.setAttribute('style', `fill: #${color}; stroke: none;`);
        rect.setAttribute('id', id);
        this.cellDefs.appendChild(rect);

        const text = this.createElement('text');
        text.textContent = id;
        text.setAttribute('x', 0);
        text.setAttribute('y', 0);
        text.setAttribute('dx', width / 2);
        text.setAttribute('dy', height - 2);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-family', 'arial');
        text.setAttribute('font-size', '9px');
        text.setAttribute('cursor', 'default');
        text.setAttribute('fill', is_black ? 'white' : 'black');
        text.setAttribute('id', id + '-label');
        this.labelDefs.appendChild(text);

        this.cellDefIndices.set(id, this.cellDefIndices.size);
        this.cellDefInfo.set(id, [color, name, count, is_black]);
        return rect;
    }

    addCellDefs(colors) {
        const defs = this.createElement('defs');
        defs.setAttribute('id', 'cell-defs');
        this.dom.appendChild(defs);
        this.cellDefs = defs;

        const labelDefs = this.createElement('defs');
        labelDefs.setAttribute('id', 'label-defs');
        this.dom.appendChild(labelDefs);
        this.labelDefs = labelDefs;

        for (const color of colors) {
            this.addCellDef(color.color, color.id, color.name, color.is_black, color.count);
        }
        return defs;
    }

    addGraphic(id, parent) {
        const g = this.createElement('g');
        g.setAttribute('id', id);
        if (parent) {
            parent.appendChild(g);
        }
        return g;
    }

    addOuter() {
        const strokeWidth = this.outerLineWidth;//this.forPrinting ? 0.4 : 2;
        const parent = this.addGraphic('outer', this.dom);
        const rect = this.createElement('rect');
        rect.id = 'background';
        rect.setAttribute('x', this.offset - this.outerLineWidth / 2);
        rect.setAttribute('y', this.offset - this.outerLineWidth / 2);
        rect.setAttribute('width', this.gridInnerWidth + this.outerLineWidth);
        rect.setAttribute('height', this.gridInnerHeight + this.outerLineWidth);
        rect.setAttribute('style', `fill: none; stroke: black; stroke-width: ${strokeWidth}`);
        parent.appendChild(rect);
        const labelOffset = this.forPrinting ? 1.0 : 5;
        const size = this.forPrinting ? '2.8pt' : '14px';

        // grid numbers
        let t = null;
        const numberParent = this.addGraphic('numbers', parent);
        const hcx1 = this.offset - labelOffset;
        const hcx2 = this.offset + this.width * this.gridSize + labelOffset;
        for (let hc = 1; hc < this.height / 10; hc++) {
            const y = this.offset + hc * 10 * this.gridSize;
            this.addText(numberParent, hcx1, y, (hc * 10).toString(), 'end', size);
            this.addText(numberParent, hcx2, y, (hc * 10).toString(), 'start', size);
        }
        const vcy1 = this.offset - labelOffset;
        const vcy2 = this.offset + this.height * this.gridSize + (this.forPrinting ? 3.6 : 17);
        for (let vc = 0; vc < this.width / 10; vc++) {
            const x = this.offset + vc * 10 * this.gridSize;
            this.addText(numberParent, x, vcy1, (vc * 10).toString(), 'end', size);
            this.addText(numberParent, x, vcy2, (vc * 10).toString(), 'end', size);
        }

        return rect;
    }

    addText(parent, x, y, s, anc, size, id, style) {
        const text = this.createElement('text');
        text.setAttribute('x', x);
        text.setAttribute('y', y);
        text.setAttribute('text-anchor', anc);
        text.setAttribute('style', `font-family: arial; font-size: ${size};` + (style ? style : ''));
        if (id) {
            text.setAttribute('id', id);
        }
        text.textContent = s;
        parent.appendChild(text);
        return text;
    }

    addGrid() {
        const defs = this.createElement('defs');
        defs.setAttribute('id', 'grid-defs');
        this.dom.appendChild(defs);

        const offset = this.offset;
        const addLineDef = (x1, y1, x2, y2, id, color, width) => {
            const line = this.createElement('line');
            line.setAttribute('x1', x1 + offset);
            line.setAttribute('y1', y1 + offset);
            line.setAttribute('x2', x2 + offset);
            line.setAttribute('y2', y2 + offset);
            line.setAttribute('stroke', color);
            line.setAttribute('stroke-width', width);
            line.setAttribute('id', id);
            defs.appendChild(line);
        }

        // minor lines
        const strokeColor = this.forPrinting ? '#c0c0c0' : '#d0d0d0';
        const lineOffset = this.forPrinting ? 0 : 0.5;
        const strokeWidth = this.forPrinting ? '0.1' : '1';
        addLineDef(0, lineOffset, this.gridInnerWidth, lineOffset, 'hgrid', strokeColor, strokeWidth);
        addLineDef(lineOffset, 0, lineOffset, this.gridInnerHeight, 'vgrid', strokeColor, strokeWidth);

        const parent = this.addGraphic('grid', this.dom);
        for (let hc = 1; hc < this.height; hc++) {
            this.addUse(parent, 'hgrid', 0, hc * this.gridSize);
        }
        for (let vc = 1; vc < this.width; vc++) {
            this.addUse(parent, 'vgrid', vc * this.gridSize, 0);
        }
        this.dom.appendChild(parent);

        // add sub-major lines
        const subMajorStrokeColor = this.forPrinting ? '#666666' : '#a0a0a0';
        const subMajorStrokeWidth = this.forPrinting ? '0.1' : '1';
        addLineDef(0, lineOffset, this.gridInnerWidth, lineOffset, 'hsmgrid', subMajorStrokeColor, subMajorStrokeWidth);
        addLineDef(lineOffset, 0, lineOffset, this.gridInnerHeight, 'vsmgrid', subMajorStrokeColor, subMajorStrokeWidth);

        for (let hc = 1; hc < this.height / 5; hc++) {
            this.addUse(parent, 'hsmgrid', 0, hc * this.gridSize * 5);
        }
        for (let vc = 1; vc < this.width / 5; vc++) {
            this.addUse(parent, 'vsmgrid', vc * this.gridSize * 5, 0);
        }

        // add major lines
        const majorStrokeColor = this.forPrinting ? '#111111' : '#000000';
        const majorStrokeWidth = this.forPrinting ? '0.2' : '1';
        addLineDef(0, lineOffset, this.gridInnerWidth, lineOffset, 'hmgrid', majorStrokeColor, majorStrokeWidth);
        addLineDef(lineOffset, 0, lineOffset, this.gridInnerHeight, 'vmgrid', majorStrokeColor, majorStrokeWidth);

        for (let hc = 1; hc < this.height / 10; hc++) {
            this.addUse(parent, 'hmgrid', 0, hc * this.gridSize * 10);
        }
        for (let vc = 1; vc < this.width / 10; vc++) {
            this.addUse(parent, 'vmgrid', vc * this.gridSize * 10, 0);
        }
    }

    addUse(parent, target, x, y) {
        const use = this.createElement('use');
        use.setAttribute('x', x);
        use.setAttribute('y', y);
        use.setAttribute('href', '#' + target);
        use.setAttribute('xlink:href', '#' + target);
        parent.appendChild(use);
        return use;
    }

    /// Creates SVG dom.
    _createDom(offsetX, offsetY, width, height, useXLink) {
        const unit = this.forPrinting ? 'mm' : 'px';
        const dom = this.createElement('svg');
        dom.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        if (useXLink) {
            dom.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        }
        dom.setAttribute('viewBox', `0 0 ${width.toFixed(1)} ${height.toFixed(1)}`);
        dom.setAttribute('width', `${width.toFixed(1)}${unit}`);
        dom.setAttribute('height', `${height.toFixed(1)}${unit}`);
        dom.setAttribute('id', 'svg-data'); // required for embedded
        return dom;
    }

    addForeignObject(id, content) {
        const obj = this.createElement('foreignObject');
        obj.setAttribute('visibility', 'hidden');
        obj.setAttribute('id', id);
        obj.textContent = content;
        this.dom.appendChild(obj);
        return obj;
    }

    calculateColorTableSize(colorCount) {
        const cellWidth = 65.;
        const lineHeight = 16.;
        const cellsInRow = Math.max(Math.floor(this.imageWidth / cellWidth), 3);
        const rows = Math.ceil(colorCount / cellsInRow);
        return [cellsInRow * cellWidth + cellWidth * 1.5, lineHeight * 5 * rows + (rows - 1) * 5 + 10];
    }

    addColorTable() {
        const cellWidth = 65.;
        const lineHeight = 16.;
        const size = this.forPrinting ? '2.8pt' : '14px';
        const colors = [];
        this.cellDefInfo.forEach(function (color, index, map) {
            colors.push([index, color]);
        });
        colors.sort(function (a, b) { return a[0] - b[0]; });
        const maxHorizontalCount = Math.max(Math.floor(this.imageWidth / cellWidth), 3);

        const g = this.addGraphic('color-table', this.dom);
        let x = this.offset;
        const tableSize = this.calculateColorTableSize(colors.length);
        let y = this.bottomY - tableSize[1] + 10;
        const addHeader = () => {
            this.addText(g, x, y, this.labels.number, 'start', size);
            y += lineHeight;
            this.addText(g, x, y, this.labels.color, 'start', size);
            y += lineHeight;
            this.addText(g, x, y, this.labels.code, 'start', size);
            y += lineHeight;
            this.addText(g, x, y, this.labels.count, 'start', size);
            y += lineHeight;
            this.addText(g, x, y, this.labels.rgb, 'start', size);
            y -= lineHeight * 4;
        }
        const addEntry = (color) => {
            x += cellWidth / 2;
            this.addText(g, x, y, color[0].toString(), 'middle', size);
            this.addRect(g, "", x + 5 - cellWidth / 2, y + 3, cellWidth - 10, lineHeight - 5,
                'fill: #' + color[1][0] + '; stroke: none; stroke-width: 1;');
            y += lineHeight;
            y += lineHeight;
            this.addText(g, x, y, color[1][1], 'middle', size);
            y += lineHeight;
            this.addText(g, x, y, color[1][2].toString(), 'middle', size);
            y += lineHeight;
            this.addText(g, x, y, '#' + color[1][0], 'middle', size);
            y -= lineHeight * 4;
            x -= cellWidth / 2;
        }
        let n = 0;
        for (const color of colors) {
            if (n == 0) {
                addHeader();
                n += 1;
                x = this.offset + cellWidth;
            }
            addEntry(color);
            n += 1;
            if (n > maxHorizontalCount) {
                x = this.offset;
                y += lineHeight * 5 + 5;
                n = 0;
            } else {
                x += cellWidth;
            }
        }
    }

    done() {
        if (this.forPrinting) {
            return;
        }
        const dataObj = this.addForeignObject('data', JSON.stringify(
            { data: this.cellData }, null, null));

        const colors = [];
        this.cellDefInfo.forEach(function (color, index, map) {
            colors.push([index, color[0], color[1]]);
        });
        colors.sort(function (a, b) { return a[0] - b[0]; });
        this.addColorTable();

        const info = {
            width: this.width, height: this.height,
            gridSize: this.gridSize, offset: this.offset,
            colors: colors,
        };
        const infoObj = this.addForeignObject('info', JSON.stringify(info, null, 1));

        const s = this.createElement('script');
        //s.setAttribute('href', './sc.js');
        s.setAttribute('id', 'svg-script');
        s.textContent = this.getScript();
        this.dom.appendChild(s);

        // Context menu
        const menu = this.addGraphic('contextmenu', this.dom);
        menu.setAttribute('visibility', 'hidden');
        menu.setAttribute('transform', 'translate(-100, -100)');
        this.addRect(menu, 'menu-outer', 0, 0, 200, 88);
        const entries = this.addGraphic('contextmenu-entries', menu);
        this.addRect(entries, 'show-this-only', 0, 0, 194, 16, 'fill: white;');
        this.addText(entries, 0, 0, 'Show this color number only', 'left', '11pt', 'show-this-only-label', 'cursor: default;');
        this.addRect(entries, 'show-this', 0, 0, 194, 16, 'fill: white;');
        this.addText(entries, 0, 0, 'Show this color number', 'left', '11pt', 'show-this-label', 'cursor: default;');
        this.addRect(entries, 'hide-this', 0, 0, 194, 16, 'fill: white;');
        this.addText(entries, 0, 0, 'Hide this color number', 'left', '11pt', 'hide-this-label', 'cursor: default;');
        this.addRect(entries, 'show-all', 0, 0, 194, 16, 'fill: white;');
        this.addText(entries, 0, 0, 'Show all color numbers', 'left', '11pt', 'show-all-label', 'cursor: default;');
        this.addRect(entries, 'hide-all', 0, 0, 194, 16, 'fill: white;');
        this.addText(entries, 0, 0, 'Hide all color numbers', 'left', '11pt', 'hide-all-label', 'cursor: default;');

        // Add information view
        const g = this.addGraphic('info-rect', this.dom);
        g.setAttribute('visibility', 'hidden');
        g.setAttribute('transform', 'translate(-200, -200)');
        this.addRect(g, 'info-bg', 0, 0, 120, 80);
        this.addRect(g, 'current-color', 45, 25, 30, 30);

        this.addText(g, 20, 45, '0', 'right', '11pt', 'left');
        this.addText(g, 85, 45, '0', 'left', '11pt', 'right');
        this.addText(g, 60, 20, '0', 'middle', '11pt', 'up');
        this.addText(g, 60, 70, '0', 'middle', '11pt', 'down');
        this.addText(g, 82, 65, '0', 'right', '8pt', 'coord-x');
        this.addText(g, 82, 75, '0', 'right', '8pt', 'coord-y');
        this.addText(g, 82, 15, '0', 'right', '8pt', 'color-id');
        this.addText(g, 82, 25, '0', 'right', '8pt', 'color-name');
    }

    addRect(parent, id, x, y, width, height, style) {
        const rect = this.createElement('rect');
        parent.appendChild(rect);
        rect.setAttribute('id', id);
        rect.setAttribute('width', width);
        rect.setAttribute('height', height);
        if (style) {
            rect.setAttribute('style', style);
        } else {
            rect.setAttribute('style',
                'fill: white; stroke: black; stroke-width: 1;');
        }
        if (!(x == 0 && y == 0)) {
            rect.setAttribute('transform', 'translate(' + x.toString() + ' ' + y.toString() + ')');
        }
        return rect;
    }

    getDOM() {
        return this.dom;
    }

    getScript() {
        return script;
    }
}
