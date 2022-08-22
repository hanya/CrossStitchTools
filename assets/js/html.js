
/*
const htmlStyleData = `
#copyright {
    font-size: 9px;
    visibility: hidden;
}
#control {
    position: fixed;
    top: 0px;
    height: 30px;
    width: 100%;
    padding-top: 3px;
    z-index: 1010;
}
#pattern {
    position: absolute;
    top: 30px;
    left: 0px;
    z-index: 1005;
}
#pattern-table {
    position: relative;
    top: 35px;
    left: 35px;
    border-collapse: collapse;
    border: solid 2px #000000;
}
.row {
    height: 12px;
    display: block;
}
.cell {
    width: 12px;
    height: 12px;
    font-size: 9px;
    font-family: arial;
    text-align: center;
    padding: 0px;
    padding-right: -1px;
    box-sizing: border-box;
    cursor: default;
}
.vert-minor-line {
    border-left: solid 1px #d0d0d0;
}
.vert-major-line {
    border-left: solid 1px #000000;
}
.vert-line {
    height: 12px;
    padding: 0px;
    box-sizing: border-box;
}
.hori-minor-line {
    border-top: solid 1px #d0d0d0;
}
.hori-major-line {
    border-top: solid 1px #000000;
}
.hori-line {
    padding: 0px;
    box-sizing: border-box;
}
.label-visible {
    visibility: visible;
}
.label-hidden {
    visibility: hidden;
}
.number {
    position: absolute;
    font-size: 14px;
    font-family: arial;
}
`;

export class HTMLWriter {
    constructor(width, height, gridSize, options) {
        this.width = width;
        this.height = height;
        this.gridSize = gridSize;
        
        this.table = null;
        this.outer = null;
        this.substyle = null;
        this.dom = this.createDom(options);
        this.currentY = -1;
        this.currentRow = null;
        this.styles = "";
    }

    createDom(options) {
        const html = document.createElement('html');

        const head = document.createElement('head');
        const meta = document.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        head.appendChild(meta);
        const title = document.createElement('title');
        title.textContent = options.title ? options.title : '';
        head.appendChild(title);
        const style = document.createElement('style');
        style.textContent = htmlStyleData;
        head.appendChild(style);
        html.appendChild(head);
        
        const style2 = document.createElement('style');
        style.setAttribute('id', 'substyle');
        head.appendChild(style2);
        this.substyle = style2;
        
        const body = document.createElement('body');
        const control = document.createElement('div');
        control.setAttribute('id', 'control');
        const selector = document.createElement('select');
        selector.setAttribute('id', 'color-number');
        control.appendChild(selector);
        this.createButton(control, 'info-button', 'Info.');
        html.appendChild(control);

        const outer = document.createElement('div');
        outer.setAttribute('id', 'pattern');
        this.outer = outer;
        const table = document.createElement('table');
        this.table = table;
        table.setAttribute('id', 'pattern-table');
        outer.appendChild(table);
        html.appendChild(outer);

        html.appendChild(body);
        return html;
    }
    
    addCellDef(color, id, name, isBlack) {
        const labelColor = isBlack ? '#ffffff' : '#000000';
        let s = `.cell-${id} { background-color: #${color}; color: ${labelColor}; }\n`;
        this.styles += s;
    }

    addCellDefs(colors) {
        for (const color of colors) {
            this.addCellDef(color.color, color.id, color.name, color.is_black);
        }
    }

    addCell(x, y, id, labeled, isBlack) {
        let firstCell = false;
        if (this.currentY != y) {
            const firstRow = this.currentRow == null;
            this.currentRow = document.createElement('tr');
            this.currentRow.classList.add('row');
            
            if (!firstRow && y != this.height - 1) {
                const hori = document.createElement('tr');
                this.table.appendChild(hori);
                const merged = document.createElement('td');
                hori.appendChild(merged);
                merged.classList.add('hori-line');
                merged.classList.add((y % 10) == 0 ? 'hori-major-line' : 'hori-minor-line');
            }
            
            this.table.appendChild(this.currentRow);
            this.currentY = y;
            firstCell = true;
        }
        if (!firstCell) {
            const vert = document.createElement('td');
            vert.classList.add('vert-line');
            vert.classList.add((x % 10) == 0 ? 'vert-major-line' : 'vert-minor-line');
            this.currentRow.appendChild(vert);
        }
        const cell = document.createElement('td');
        cell.classList.add('cell');
        cell.classList.add(`cell-${id}`);
        const label = document.createElement('span');
        label.classList.add('label-visible');
        label.classList.add(`label-${id}`);
        label.textContent = id;
        cell.appendChild(label);
        this.currentRow.appendChild(cell);
    }

    createButton(parent, id, label) {
        const button = document.createElement('input');
        button.setAttribute('type', 'button');
        button.setAttribute('id', id);
        button.setAttribute('value', label);
        button.setAttribute('class', 'button');
        parent.appendChild(button);
        return button;
    }

    done() {
        const gridSize = this.gridSize + 2;
        const gridWidth = 12;
        const gridHeight = 14;
        const parent = this.outer;
        let x = 25;
        let y = 18;
        const height = gridHeight * this.height;
        for (let n = 0; n < this.width; n += 10) {
            this.createNumber(parent, n.toString(), x, y, 'ht');
            this.createNumber(parent, n.toString(), x, y + height, 'hb');
            x += gridWidth * 10;
        }
        x = 15;
        y += gridSize * 10;
        const width = gridWidth * this.width + 25;
        for (let n = 10; n < this.height; n += 10) {
            this.createNumber(parent, n.toString(), x, y, 'vl');
            this.createNumber(parent, n.toString(), x + width, y, 'vr');
            y += gridHeight * 10;
        }
        
        this.substyle.textContent = this.styles;
        return this.dom;
    }

    createNumber(parent, s, x, y, n, align) {
        const span = document.createElement('div');
        span.classList.add('number');
        span.classList.add(`number-${s}-${n}`);
        span.textContent = s;
        parent.appendChild(span);
        this.styles += `.number-${s}-${n} { left: ${x}px; top: ${y}px; }\n`;
    }
}
*/

const styleData = `
#control {
    position: fixed;
    top: 0px;
    height: 30px;
    width: 100%;
    padding-top: 3px;
    z-index: 1010;
}
#svg {
    position: absolute;
    top: 20px;
    left: 0px;
    z-index: 1005;
}
.button {
    margin-left: 3px;
}
`;


export class SVGInHTMLWriter {
    constructor(options, svgDom) {
        this.dom = this.createDom(options, svgDom);
    }

    createDom(options, svgDom) {
        const html = document.createElement('html');

        const head = document.createElement('head');
        const meta = document.createElement('meta');
        meta.setAttribute('charset', 'utf-8');
        head.appendChild(meta);
        const title = document.createElement('title');
        title.textContent = options.title ? options.title : '';
        head.appendChild(title);
        const style = document.createElement('style');
        style.textContent = styleData;
        head.appendChild(style);
        html.appendChild(head);

        const body = document.createElement('body');
        const control = document.createElement('div');
        control.setAttribute('id', 'control');
        const selector = document.createElement('select');
        selector.setAttribute('id', 'color-number');
        control.appendChild(selector);
        this.createButton(control, 'info-button', 'Info.');
        html.appendChild(control);

        const svg = document.createElement('div');
        svg.setAttribute('id', 'svg');
        svg.appendChild(svgDom);
        html.appendChild(svg);

        html.appendChild(body);
        return html;
    }

    createButton(parent, id, label) {
        const button = document.createElement('input');
        button.setAttribute('type', 'button');
        button.setAttribute('id', id);
        button.setAttribute('value', label);
        button.setAttribute('class', 'button');
        parent.appendChild(button);
        return button;
    }

    done() {
        return this.dom;
    }
}
