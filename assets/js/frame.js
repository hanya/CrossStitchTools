'use strict';

import { countsList } from "./fabric.js";

const daiso = 1;
const seria = 2;
const cando = 4;

// Frame data
//サイズ	幅	高さ	内幅	内高さ
const frameList = [
["木製ミニフォトフレーム", 91, 57, 81, 48, daiso],
["L", 89, 127, 80, 120, daiso],
["2L",127, 178, 119, 170, daiso],
//["はがき", 100, 148, daiso],
["スタンダードフレーム(色紙額)", 242, 272, 230, 260, daiso],
["B5", 182, 257, daiso],
["B4", 257, 364, daiso],
["A5", 148, 210, daiso],
["A4 (クリアファイル対応)", 210, 297, 206, 297, daiso],
["A3", 297, 420, daiso],
["A2", 420, 594, daiso],
["木製リーフフレームS", 56, 56, 48, 48, seria + cando],
["ウッドフレームシンプル A4/B5", 213, 299, 204, 291, seria + cando],
];


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

    addTD(parent, cls, text) {
        const td = document.createElement('td');
        td.setAttribute('class', cls);
        td.textContent = text;
        parent.appendChild(td);
        return td;
    }

    getCount() {
        const index = document.getElementById('counts').selectedIndex;
        return countsList[index][1];
    }

    fillFrames() {
        const count = this.getCount();
        const table = document.getElementById('frames');
        let lastTr = null;
        for (const entry of frameList) {
            if (entry.length > 4) {
                const tr = document.createElement('tr');
                this.addTD(tr, 'text', entry[0]);
                this.addTD(tr, 'numeric', entry[1]);
                this.addTD(tr, 'numeric', entry[2]);
                this.addTD(tr, 'numeric', entry[3]);
                this.addTD(tr, 'numeric', entry[4]);
                this.addTD(tr, 'numeric', this.toGrains(entry[3], count));
                this.addTD(tr, 'numeric', this.toGrains(entry[4], count));
                this.addTD(tr, 'numeric', (entry[1]/entry[2]).toFixed(2));
                this.addTD(tr, 'numeric', (entry[2]/entry[1]).toFixed(2));
                this.addTD(tr, 'text', this.getShopList(entry[5]));
                table.appendChild(tr);
                lastTr = tr;
            }
        }
        if (lastTr) {
            lastTr.setAttribute('class', 'bottom-row');
        }
    }

    toGrains(len, count) {
        return (len / 100 * count).toFixed(1);
    }

    addBit(text, data, bit, label) {
        if ((data & bit) > 0) {
            if (text.length > 0) {
                return text + ', ' + label;
            } else {
                return label;
            }
        }
        return text;
    }

    getShopList(bits) {
        let shop = '';
        shop = this.addBit(shop, bits, daiso, '1');
        shop = this.addBit(shop, bits, seria, '2');
        shop = this.addBit(shop, bits, cando, '3');
        if (shop.length > 0) {
            return '[' + shop + ']';
        } else {
            return '';
        }
    }

    findFirstTR(table) {
        for (const node of table.childNodes) {
            if (node.tagName == 'TBODY') {
                return node;
            }
        }
        return null;
    }

    init() {
        this.fillCount();
        this.fillFrames();
    }
}

window.onload = function () {
    const ui = new UI();
    ui.init();

    document.getElementById('counts').addEventListener('change', function(ev) {
        const table = document.getElementById('frames');
        const header = ui.findFirstTR(table);
        while (header.nextSibling) {
            table.removeChild(header.nextSibling);
        }
        ui.fillFrames();
    }, false);
}
