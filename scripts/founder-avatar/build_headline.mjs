// Turns the headline into glyph outlines for the 3D letters.
//   npm i --no-save opentype.js && node build_headline.mjs Anton-Regular.ttf ../../src/components/landing/hero3d/headlineGlyphs.json
// Anton (SIL Open Font License) is the Impact lookalike the site already loads.
import fs from "node:fs";
import opentype from "opentype.js";

const [fontPath, out] = process.argv.slice(2);
const buffer = fs.readFileSync(fontPath);
const font = opentype.parse(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength));
const word = (text) => {
  let x = 0;
  const commands = [];
  const glyphs = font.stringToGlyphs(text);
  glyphs.forEach((glyph, i) => {
    for (const c of glyph.path.commands) {
      if (c.type === "M") commands.push(["M", c.x + x, c.y]);
      else if (c.type === "L") commands.push(["L", c.x + x, c.y]);
      else if (c.type === "Q") commands.push(["Q", c.x1 + x, c.y1, c.x + x, c.y]);
      else if (c.type === "C") commands.push(["C", c.x1 + x, c.y1, c.x2 + x, c.y2, c.x + x, c.y]);
      else if (c.type === "Z") commands.push(["Z"]);
    }
    x += glyph.advanceWidth + font.unitsPerEm * 0.045; // a little air: the sides need room
    if (glyphs[i + 1]) x += font.getKerningValue(glyph, glyphs[i + 1]);
  });
  return { width: x, commands };
};
const capHeight = font.tables.os2.sCapHeight || font.charToGlyph("H").yMax;
fs.writeFileSync(out, JSON.stringify({ capHeight, HANDMADE: word("HANDMADE"), CROCHET: word("CROCHET") }));
console.log("capHeight", capHeight);
