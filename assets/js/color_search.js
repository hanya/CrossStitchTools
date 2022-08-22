
import { anchorColors } from './anchor.js';
import { cosmoColors } from './cosmo.js';
import { daisoColors } from './daiso.js';
import { dmcColors } from './dmc.js';
import { olympusColors } from './olympus.js';
import { rgbToHex, colorSearch } from './color.js';

const anchorRows = [24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 24, 12];
const cosmoRows = [39, 35, 40, 33, 33, 40, 42, 41, 37, 35, 29, 33, 34, 29];
const daisoRows = [12, 12, 12, 12, 12];
const dmcRows = [24, 26, 24, 25, 24, 22, 21, 26, 26, 26, 24, 25, 22, 22, 25, 25, 22, 24, 24, 25];
const olympusRows = [27, 26, 27, 27, 24, 26, 26, 27, 27, 26, 27, 27, 27, 27, 24, 25];

const manufactureres = {
    'anchor': [anchorColors, anchorRows, 'アンカー'],
    'cosmo': [cosmoColors, cosmoRows, 'コスモ'],
    'daiso': [daisoColors, daisoRows, 'ダイソー'],
    'dmc': [dmcColors, dmcRows, 'DMC'],
    'olympus': [olympusColors, olympusRows, 'オリムパス'],
};

const titleBase = '${NAME}25番刺しゅう糸色検索(非公式)';
const descBase = 'RGB値から${NAME}25番刺しゅう糸の近い色を検索';


function getManufacturerFromQS() {
    let m = 'cosmo';
    const qs = window.location.search.slice(1);
    qs.split('&').forEach((q) => {
        const kv = q.split('=');
        const key = kv[0];
        const value = kv[1];
        switch (key) {
            case 'm': {
                if (manufactureres[value]) {
                   m = value;
                }
                break;
            }
            default:
                break;
        }
    });
    return m;
}

function setText(id, s) {
    document.getElementById(id).textContent = s;
}


window.onload = function () {
    const m = getManufacturerFromQS();
    const [colors, rowsCount, nameJP] = manufactureres[m];
    setText('title', titleBase.replace('${NAME}', nameJP));
    setText('desc', descBase.replace('${NAME}', nameJP));

    let showHex = isHex();
    const d = document.getElementById('color-tables');
    let n = 0;
    for (const rows of rowsCount) {
        const table = document.createElement('table');
        table.classList.add('color-table');
        for (let i = 0; i < rows; i++) {
            const colorDef = colors[n];
            const tdColor = document.createElement('td');
            tdColor.classList.add('color');
            tdColor.style = `background: rgb(${colorDef[2]}, ${colorDef[3]}, ${colorDef[4]});`;

            const tdName = document.createElement('td');
            tdName.classList.add('name');
            setColor(tdName, colorDef, showHex);

            const tr = document.createElement('tr');
            tr.appendChild(tdColor);
            tr.appendChild(tdName);
            table.appendChild(tr);
            n += 1;
        }
        d.appendChild(table);
    }

    const ownedList = new Map();

    function readOwnedList() {
        ownedList.clear();
        const lines = document.getElementById('owned').value.split('\n');
        for (const line of lines) {
            ownedList.set(line, true);
        }
        console.log(ownedList);
    }

    function hasColor(color) {
        return ownedList.get(color) == true;
    }

    function clearResult() {
        const table = document.getElementById('result-table');
        while (table.firstChild) {
            table.removeChild(table.firstChild);
        }
    }

    function createTR(table) {
        const tr = document.createElement('tr');
        table.appendChild(tr);
        return tr;
    }

    function createTD(tr, cls, s) {
        const td = document.createElement('td');
        tr.appendChild(td);
        td.style = cls;
        td.textContent = s;
        return td;
    }

    function addColorTD(tr, color) {
        const td = createTD(tr, color, '');
        td.style = `background: rgb(${color[2]}, ${color[3]}, ${color[4]});`;
    }

    const resultTable = document.getElementById('result-table');

    function addConversion(result, name) {
        const tr = createTR(resultTable);
        createTD(tr, '', name);
        for (let i = 0; i < 7; i++) {
            const [color, distance_] = result[i];

            addColorTD(tr, color);
            const nameTD = createTD(tr, 'name', '');
            setColor(nameTD, color, showHex, hasColor(color[0]));
        }
    }

    function pushResult(rgb, result) {
        const tr = createTR(resultTable);
        createTD(tr, '', "検索色");
        addColorTD(tr, rgb);
        const nameTD = createTD(tr, 'name', '');
        setColor(nameTD, rgb, showHex);

        addConversion(result.ciede2k, 'CIEDE2K');
        addConversion(result.rgb, 'RGB');
        addConversion(result.xyz, 'XYZ');
        addConversion(result.lab, 'Lab');
    }

    function convertAll() {
        clearResult();
        readOwnedList();
        showHex = isHex();
        const lines = document.getElementById('rgb-value').value.split('\n');
        for (const line of lines) {
            const rgb = readRGB(line);
            //const result = convert(rgb);
            const result = colorSearch(colors, rgb[2], rgb[3], rgb[4], 7);
            pushResult(rgb, result);
        }
    }

    function setColor(element, color, showHex) {
        if (showHex) {
            element.innerHTML = `${color[0]}<br><span class="rgb">${color[1]}</span>`;
        } else {
            element.innerHTML = `${color[0]}<br><span class="rgb">${color[1]}, ${color[2]}, ${color[3]}</span>`;
        }
    }

    function isHex() {
        return document.getElementById('hex').checked;
    }

    function readRGB() {
        const value = document.getElementById('rgb-value').value.trim();
        const values = value.split(',');
        if (values.length == 3) {
            const rgb = [
                parseInt(values[0].trim()),
                parseInt(values[1].trim()),
                parseInt(values[2].trim())];
            return [value, rgbToHex(rgb[0], rgb[1], rgb[2]),
                    rgb[0], rgb[1], rgb[2]];
        } else if (values.length == 1) {
            const color = parseInt(value, 16);
            const r = (color & 0xff0000) >> 16;
            const g = (color & 0xff00) >> 8;
            const b = color & 0xff;
            return [value, value, r, g, b];
        } else {
            return null;
        }
    }

    document.getElementById('start').addEventListener('click', convertAll);

    function keypress(e) {
        if (e.key == 'Enter') {
            convert();
        }
    }

    document.getElementById('rgb-value').focus();
    //document.getElementById('rgb-value').addEventListener('keypress', keypress);
}
