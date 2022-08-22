
import { colorPalettes } from './colors.js';

const header = `GIMP Palette
Name: #{NAME}
#
`;
// R G B NAME

window.onload = function() {
    function addTR(parent, name, link) {
        const tr = document.createElement('tr');
        parent.appendChild(tr);
        const td = document.createElement('td');
        tr.appendChild(td);
        const a = document.createElement('a');
        td.appendChild(a);
        a.textContent = name;
        a.href = link;
        return td;
    }

    const gimpTable = document.getElementById('gimp');
    for (const entry of colorPalettes) {
        const name = entry[0];
        const palette = entry[1];

        let s = header.replace('#{NAME}', name);
        for (const color of palette) {
            s += color[2].toString() + ' ' + color[3].toString() + ' ' + color[4].toString() + ' ' + color[0] + '\n';
        }
        const f = new File([s], name + ".gpl", {type: "text"});
        const link = URL.createObjectURL(f);

        addTR(gimpTable, name, link);
    }
}
