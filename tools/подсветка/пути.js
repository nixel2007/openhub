// Где лежит то, что инструмент собирает и стережёт: всё это — статика хаба, а не сам инструмент.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const статика = fileURLToPath(new URL('../../src/статика/', import.meta.url));

// .mjs node грузит модулем без распознавания синтаксиса; браузер смотрит не на расширение, а на тип ответа
export const имяДвижка = 'shiki-bsl.mjs';
export const каталогДвижка = path.join(статика, 'подсветка');
export const файлДвижка = path.join(каталогДвижка, имяДвижка);
export const файлЛицензий = path.join(каталогДвижка, 'LICENSE');
export const файлКлея = path.join(статика, 'openhub-highlight.js');
export const файлЛиста = path.join(статика, 'openhub.css');
