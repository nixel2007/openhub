// Клей подсветки исполняется так же, как в браузере, — классическим скриптом над готовым
// DOM (linkedom). Движок приходит адресом file:// в data-highlight: настоящий бандл
// из статики хаба либо подставной модуль, когда проверяется поведение самого клея.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseHTML } from 'linkedom';
import { файлДвижка, файлКлея } from './пути.js';

const исходникКлея = fs.readFileSync(файлКлея, 'utf8');
const движок = pathToFileURL(файлДвижка).href;

// Подставной движок: помечает каждую загрузку и честно режет код на строки; код со словом
// СЛОМАТЬ роняет, а со словом ПОТЕРЯТЬ возвращает токены, из которых текст не собрать.
const каталогПодставы = fs.mkdtempSync(path.join(os.tmpdir(), 'подсветка-клей-'));
const файлПодставы = path.join(каталогПодставы, 'подставной-движок.mjs');
fs.writeFileSync(файлПодставы, `
(globalThis.загрузкиДвижка ??= []).push(import.meta.url);
export function токены(код) {
	if (код.includes('СЛОМАТЬ')) throw new Error('движок не справился');
	if (код.includes('ПОТЕРЯТЬ')) return [[{ content: 'обрезано', color: 'var(--shiki-foreground)' }]];
	return код.split('\\n').map((строка) => [{ content: строка, color: 'var(--shiki-token-keyword)' }]);
}
`);
// адрес нормализуется так же, как его видит модуль в import.meta.url, — с кодированным запросом
const подстава = (метка) => new URL(`?${метка}`, pathToFileURL(файлПодставы)).href;

after(() => fs.rmSync(каталогПодставы, { recursive: true, force: true }));

function запустить(тело) {
	const { document } = parseHTML(`<!doctype html><html><head></head><body>${тело}</body></html>`);
	globalThis.document = document;
	new Function(исходникКлея)();
	return document;
}

async function дождаться(условие, чего) {
	const срок = Date.now() + 5000;
	while (!условие()) {
		if (Date.now() > срок) assert.fail(`не дождались: ${чего}`);
		await new Promise((готово) => setTimeout(готово, 10));
	}
}

const раскрашен = (код) => код.querySelector('span') !== null;

function область(адрес, содержимое) {
	return `<div class="prose" data-highlight="${адрес}">${содержимое}</div>`;
}

function блок(язык, код, метка = '') {
	const класс = язык === null ? '' : ` class="language-${язык}"`;
	return `<pre><code${класс} id="${метка}">${код}</code></pre>`;
}

test('блок BSL раскрашен, а текст его кода не изменился', async () => {
	const код = 'Если Истина Тогда\n\tСообщить(&quot;Привет&quot;);\n\nКонецЕсли;\n';
	const документ = запустить(область(движок, блок('bsl', код, 'bsl')));
	const элемент = документ.getElementById('bsl');
	const прежнийТекст = элемент.textContent;

	await дождаться(() => раскрашен(элемент), 'раскраски блока bsl');

	assert.equal(элемент.textContent, прежнийТекст, 'текст кода побайтно тот же');
	const если = [...элемент.querySelectorAll('span')].find((с) => с.textContent === 'Если');
	assert.ok(если, 'ключевое слово стоит своим токеном');
	assert.match(если.getAttribute('style'), /color:\s*var\(--shiki-token-keyword\)/);
});

test('language-1c и language-BSL раскрашиваются тоже', async () => {
	const документ = запустить(область(движок,
		блок('1c', 'Если Истина Тогда\nКонецЕсли;', 'один-эс')
		+ блок('BSL', 'Возврат Неопределено;', 'заглавные')));

	for (const метка of ['один-эс', 'заглавные']) {
		const элемент = документ.getElementById(метка);
		await дождаться(() => раскрашен(элемент), `раскраски блока «${метка}»`);
	}
});

test('блоки чужих языков и без языка не тронуты', async () => {
	const документ = запустить(область(движок,
		блок('bash', 'opm install winow', 'bash')
		+ блок('json', '{ "Если": true }', 'json')
		+ блок(null, 'Если Истина Тогда', 'без-языка')
		+ блок('bsl', 'Если Истина Тогда', 'контроль')));
	const прежние = снимок(документ, ['bash', 'json', 'без-языка']);

	await дождаться(() => раскрашен(документ.getElementById('контроль')), 'раскраски контрольного блока');

	assert.deepEqual(снимок(документ, ['bash', 'json', 'без-языка']), прежние);
});

test('код вне области подсветки и строчный код не тронуты', async () => {
	const документ = запустить(
		'<article><pre><code class="language-bsl" id="вне">Если Истина Тогда</code></pre></article>'
		+ область(движок, '<p>Вызовите <code class="language-bsl" id="строчный">Сообщить()</code>.</p>'
			+ блок('bsl', 'Если Истина Тогда', 'контроль')));
	const прежние = снимок(документ, ['вне', 'строчный']);

	await дождаться(() => раскрашен(документ.getElementById('контроль')), 'раскраски контрольного блока');

	assert.deepEqual(снимок(документ, ['вне', 'строчный']), прежние);
});

test('README без блоков BSL не грузит движок вовсе', async () => {
	запустить(область(подстава('лишний'), блок('bash', 'opm install winow', 'bash')));
	const контрольный = запустить(область(подстава('нужный'), блок('bsl', 'Если', 'контроль')));

	await дождаться(() => раскрашен(контрольный.getElementById('контроль')),
		'раскраски контрольного блока тем же подставным движком');

	const загрузки = globalThis.загрузкиДвижка ?? [];
	assert.ok(загрузки.includes(подстава('нужный')), 'подставной движок загружается');
	assert.ok(!загрузки.includes(подстава('лишний')), 'без блоков BSL движок не запрошен');
});

test('движок не приехал — блоки остаются текстом, отказ загрузки обработан', async () => {
	const необработанные = [];
	const ловушка = (причина) => необработанные.push(причина);
	process.on('unhandledRejection', ловушка);
	try {
		const битый = pathToFileURL(path.join(каталогПодставы, 'нет-такого-движка.mjs')).href;
		const документ = запустить(область(битый, блок('bsl', 'Если Истина Тогда', 'bsl')));
		const прежний = снимок(документ, ['bsl']);

		await import(битый).catch(() => {});
		await new Promise((готово) => setTimeout(готово, 50));

		assert.deepEqual(снимок(документ, ['bsl']), прежний);
		assert.deepEqual(необработанные, [], 'отказ загрузки движка обработан клеем');
	} finally {
		process.off('unhandledRejection', ловушка);
	}
});

test('сбой движка на одном блоке оставляет его текстом и не мешает соседям', async () => {
	const документ = запустить(область(подстава('сбой'),
		блок('bsl', 'СЛОМАТЬ', 'сломанный')
		+ блок('bsl', 'ПОТЕРЯТЬ часть текста', 'потерянный')
		+ блок('bsl', 'Если Истина Тогда', 'целый')));
	const прежние = снимок(документ, ['сломанный', 'потерянный']);

	await дождаться(() => раскрашен(документ.getElementById('целый')), 'раскраски соседнего блока');

	assert.deepEqual(снимок(документ, ['сломанный', 'потерянный']), прежние,
		'блок, который движок уронил или исказил, остался как был');
});

test('разметка внутри кода остаётся текстом', async () => {
	const документ = запустить(область(движок,
		блок('bsl', 'Текст = "&lt;img src=x onerror=alert(1)&gt;";', 'bsl')));
	const элемент = документ.getElementById('bsl');

	await дождаться(() => раскрашен(элемент), 'раскраски блока');

	assert.equal(документ.querySelector('img'), null, 'картинка из кода не родилась');
	assert.ok(элемент.textContent.includes('<img src=x onerror=alert(1)>'));
});

function снимок(документ, метки) {
	return метки.map((метка) => документ.getElementById(метка).outerHTML);
}
