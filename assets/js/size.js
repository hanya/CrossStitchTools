

import { countsList } from './fabric.js';

class CountUI {
    constructor() {
        this.table = document.getElementById('count-output');
    }

    getWidth() {
        return document.getElementById('count-width').value;
    }

    getHeight() {
        return document.getElementById('count-height').value;
    }

    addTR() {
        const tr = document.createElement('tr');
        this.table.appendChild(tr);
        return tr;
    }

    addTD(tr, id, s) {
        const td = document.createElement('td');
        td.id = id;
        td.textContent = s;
        td.setAttribute('class', 'numeric');
        tr.appendChild(td);
        return td;
    }

    addEntry(n, count, par10, width, height) {
        const baseID = n.toString() + '-count';
        const tr = this.addTR();
        this.addTD(tr, baseID + '-count', count);
        this.addTD(tr, baseID + '-par10', par10);
        this.addTD(tr, baseID + '-width', width);
        this.addTD(tr, baseID + '-height', height);
    }

    setText(id, s) {
        document.getElementById(id).textContent = s;
    }

    setEntry(n, count, par10, width, height) {
        const baseID = n.toString() + '-count';
        this.setText(baseID + '-count', count);
        this.setText(baseID + '-par10', par10);
        this.setText(baseID + '-width', width);
        this.setText(baseID + '-height', height);
    }
}

class SizeUI {
    constructor() {
        this.table = document.getElementById('size-output');
    }

    getWidth() {
        return document.getElementById('size-width').value;
    }

    getHeight() {
        return document.getElementById('size-height').value;
    }

    addTR() {
        const tr = document.createElement('tr');
        this.table.appendChild(tr);
        return tr;
    }

    addTD(tr, id, s) {
        const td = document.createElement('td');
        td.id = id;
        td.textContent = s;
        td.setAttribute('class', 'numeric');
        tr.appendChild(td);
        return td;
    }

    addEntry(n, count, par10, width, height) {
        const baseID = n.toString() + '-size';
        const tr = this.addTR();
        this.addTD(tr, baseID + '-count', count);
        this.addTD(tr, baseID + '-par10', par10);
        this.addTD(tr, baseID + '-width', width);
        this.addTD(tr, baseID + '-height', height);
    }

    setText(id, s) {
        document.getElementById(id).textContent = s;
    }

    setEntry(n, count, par10, width, height) {
        const baseID = n.toString() + '-size';
        this.setText(baseID + '-count', count);
        this.setText(baseID + '-par10', par10);
        this.setText(baseID + '-width', width);
        this.setText(baseID + '-height', height);
    }
}

window.onload = function () {
    const countUI = new CountUI();

    function countInit() {
        const width = countUI.getWidth();
        const height = countUI.getHeight();

        let n = 0;
        for (const entry of countsList) {
            const ss = 100 / entry[1];
            const w = (width * ss).toFixed(1);
            const h = (height * ss).toFixed(1);
            countUI.addEntry(n, entry[0], entry[1], w, h);
            n += 1;
        }
    }

    function countUpdate() {
        const width = countUI.getWidth();
        const height = countUI.getHeight();

        let n = 0;
        for (const entry of countsList) {
            const ss = 100 / entry[1];
            const w = (width * ss).toFixed(1);
            const h = (height * ss).toFixed(1);
            countUI.setEntry(n, entry[0], entry[1], w, h);
            n += 1;
        }
    }

    document.getElementById('count-width').addEventListener('change', function() {
        countUpdate();
    });
    document.getElementById('count-height').addEventListener('change', function() {
        countUpdate();
    });

    countInit();

    const sizeUI = new SizeUI();

    function sizeInit() {
        const width = sizeUI.getWidth();
        const height = sizeUI.getHeight();

        let n = 0;
        for (const entry of countsList) {
            const ss = 100 / entry[1];
            const w = (width / ss).toFixed(1);
            const h = (height / ss).toFixed(1);
            sizeUI.addEntry(n, entry[0], entry[1], w, h);
            n += 1;
        }
    }

    function sizeUpdate() {
        const width = sizeUI.getWidth();
        const height = sizeUI.getHeight();

        let n = 0;
        for (const entry of countsList) {
            const ss = 100 / entry[1];
            const w = (width / ss).toFixed(1);
            const h = (height / ss).toFixed(1);
            sizeUI.setEntry(n, entry[0], entry[1], w, h);
            n += 1;
        }
    }

    document.getElementById('size-width').addEventListener('change', function() {
        sizeUpdate();
    });
    document.getElementById('size-height').addEventListener('change', function() {
        sizeUpdate();
    });

    sizeInit();
}
