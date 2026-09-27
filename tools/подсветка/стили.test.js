// Цвета подсветки: движок пишет в токен var(--shiki-…), а значение переменной даёт лист
// хаба на области подсветки. Необъявленную переменную браузер отбрасывает, и токен молча
// теряет цвет, поэтому набор переменных снимается с самой темы, а не списком здесь.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import postcss from 'postcss';
import { файлЛиста } from './пути.js';
import { цветаТемы } from './тема.js';

function переменныеТемы() {
	const имена = [...цветаТемы()].flatMap((цвет) =>
		[...цвет.matchAll(/var\((--[\w-]+)/g)].map((найденное) => найденное[1]));
	return [...new Set(имена)].sort();
}

// Объявления правила самой области: верхний уровень листа и селектор [data-highlight]
// целиком. Разбирает настоящий парсер, поэтому комментарий и строка объявлением не станут.
function объявленияОбласти(текстЛиста) {
	const объявления = new Map();
	for (const узел of postcss.parse(текстЛиста).nodes) {
		if (узел.type !== 'rule' || !узел.selectors.some((с) => с.trim() === '[data-highlight]')) {
			continue;
		}
		узел.each((объявление) => {
			if (объявление.type === 'decl') объявления.set(объявление.prop, объявление.value);
		});
	}
	return объявления;
}

const объявленияЛиста = () => объявленияОбласти(fs.readFileSync(файлЛиста, 'utf8'));

test('объявление в комментарии, в строке и в чужом правиле объявлением не считается', () => {
	const образец = `
		/* [data-highlight] { --shiki-token-keyword: var(--color-accent); } */
		[data-highlight] {
			/* --shiki-token-string: var(--color-success); */
			content: "--shiki-token-comment: var(--color-text-muted);";
			--shiki-foreground: var(--color-text);
		}
		[data-highlight] pre { --shiki-token-constant: var(--color-warning); }
		@media print { [data-highlight] { --shiki-token-link: var(--color-accent); } }
	`;
	const объявленные = [...объявленияОбласти(образец).keys()].filter((имя) => имя.startsWith('--'));
	assert.deepEqual(объявленные, ['--shiki-foreground']);
});

test('каждая переменная, которую тема выдаёт токену, объявлена на области подсветки', () => {
	const нужные = переменныеТемы();
	assert.ok(нужные.includes('--shiki-foreground') && нужные.includes('--shiki-token-keyword'),
		`разбор темы ослеп: ${нужные.join(', ')}`);

	const объявленные = объявленияЛиста();
	assert.deepEqual(нужные.filter((имя) => !объявленные.has(имя)), [],
		'переменные темы, которых лист не объявляет на [data-highlight]');
});

test('подсветка красит палитрой кита, своих цветов у неё нет', () => {
	const своих = [...объявленияЛиста()].filter(([имя]) => имя.startsWith('--shiki-'));
	assert.ok(своих.length > 0, 'на [data-highlight] не объявлено ни одной переменной подсветки');
	for (const [имя, значение] of своих) {
		assert.match(значение, /^var\(--color-[a-z0-9-]+\)$/, `${имя}: ${значение}`);
	}
});
