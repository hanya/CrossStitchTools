
export function distance(a1, b1, c1, a2, b2, c2) {
    const da = a1 - a2;
    const db = b1 - b2;
    const dc = c1 - c2;
    return Math.sqrt(da * da + db * db + dc * dc);
}

export function distance2(a1, b1, c1, a2, b2, c2) {
    const da = a1 - a2;
    const db = b1 - b2;
    const dc = c1 - c2;
    return da * da + db * db + dc * dc;
}

export function rgbToHex(r, g, b) {
    let rh = r.toString(16);
    let gh = g.toString(16);
    let bh = b.toString(16);
    return (rh.length == 2 ? rh : "0" + rh) +
           (gh.length == 2 ? gh : "0" + gh) +
           (bh.length == 2 ? bh : "0" + bh);
}

export function toRGB(s) {
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

export function toGrayscale(hex) {
    const nrgb = toRGB(hex);
    const g = 0.2126 * nrgb[1] + 0.7152 * nrgb[2] + 0.0722 * nrgb[3];
    return g;
}

export function isBlack(hex) {
    const nrgb = toRGB(hex);
    const g = 0.2126 * nrgb[1] + 0.7152 * nrgb[2] + 0.0722 * nrgb[3];
    return g < 128;
}

export function rgbToXYZ(rd, gd, bd) {
    let r
    if (rd > 0.040450) {
        r = Math.pow((rd + 0.055) / 1.055, 2.4);
    } else {
        r = rd / 12.92;
    }
    let g
    if (gd > 0.040450) {
        g = Math.pow((gd + 0.055) / 1.055, 2.4);
    } else {
        g = gd / 12.92;
    }
    let b
    if (bd > 0.040450) {
        b = Math.pow((bd + 0.055) / 1.055, 2.4);
    } else {
        b = bd / 12.92;
    }
    const x = 0.4124 * r + 0.3576 * g + 0.1805 * b;
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const z = 0.0193 * r + 0.1192 * g + 0.9505 * b;
    return [x, y, z];
}

// d50
const wXYZ = [0.9642, 1., 0.8251];

export function xyzToLab(x, y, z) {
    let xxw = x / wXYZ[0];
    let yyw = y / wXYZ[1];
    let zzw = z / wXYZ[2];
    xxw = xxw > 0.0088564 ? Math.pow(xxw, 1/3) : 7.787 * xxw + 4/29;
    yyw = yyw > 0.0088564 ? Math.pow(yyw, 1/3) : 7.787 * yyw + 4/29;
    zzw = zzw > 0.0088564 ? Math.pow(zzw, 1/3) : 7.787 * zzw + 4/29;
    const L = 116 * yyw - 16;
    const a = 500 * (xxw - yyw);
    const b = 200 * (yyw - zzw);
    return [L, a, b];
}

export function colorSearch(colors, rgbR, rgbG, rgbB, n) {
    const baseR = rgbR / 255;
    const baseG = rgbG / 255;
    const baseB = rgbB / 255;
    const [x, y, z] = rgbToXYZ(baseR, baseG, baseB);
    const [L, a, b] = xyzToLab(x, y, z);

    const dRGB = [];
    const dXYZ = [];
    const dLab = [];
    const dCIEDE2k = [];
    for (let i = 0; i < colors.length; i++) {
        const color = colors[i];
        dRGB.push([color,
            distance(baseR, baseG, baseB, color[2]/255, color[3]/255, color[4]/255)]);
        dXYZ.push([color,
            distance(x, y, z, color[5], color[6], color[7])]);
        dLab.push([color,
            distance(L, a, b, color[8], color[9], color[10])]);
        dCIEDE2k.push([color,
            Colour.deltaE00(L, a, b, color[8], color[9], color[10])]);
    }
    function sortFunc(a, b) {
        return a[1] - b[1];
    }
    dRGB.sort(sortFunc);
    dXYZ.sort(sortFunc);
    dLab.sort(sortFunc);
    dCIEDE2k.sort(sortFunc);

    const result = {
        rgb: [],
        xyz: [],
        lab: [],
        ciede2k: [],
    };

    function putResult(r, a) {
        for (let i = 0; i < n; i++) {
            a.push(r[i]);
        }
    }

    putResult(dRGB, result.rgb);
    putResult(dXYZ, result.xyz);
    putResult(dLab, result.lab);
    putResult(dCIEDE2k, result.ciede2k);

    return result;
}
