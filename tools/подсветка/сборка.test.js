// Минифицированный бандл глазами не проверить: доверие к нему держится на том, что сборка
// из package-lock даёт закоммиченные файлы байт в байт.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { собрать } from './собрать.js';
import { имяДвижка, каталогДвижка } from './пути.js';

async function свежаяСборка() {
	const каталог = fs.mkdtempSync(path.join(os.tmpdir(), 'подсветка-сборка-'));
	const итог = await собрать(каталог);
	return { каталог, итог };
}

test('сборка воспроизводит закоммиченные движок и LICENSE байт в байт', async () => {
	const { каталог } = await свежаяСборка();
	try {
		for (const имя of [имяДвижка, 'LICENSE']) {
			const свежий = fs.readFileSync(path.join(каталог, имя));
			const закоммиченный = fs.readFileSync(path.join(каталогДвижка, имя));
			assert.ok(свежий.equals(закоммиченный), `${имя}: пересборка даёт ${свежий.length} байт`
				+ ` вместо ${закоммиченный.length} — пересоберите движок (npm run build) и закоммитьте`);
		}
	} finally {
		fs.rmSync(каталог, { recursive: true, force: true });
	}
});

test('LICENSE называет каждый пакет, чей код вошёл в движок, и происхождение грамматики', async () => {
	const { каталог, итог } = await свежаяСборка();
	try {
		const лицензии = fs.readFileSync(path.join(каталог, 'LICENSE'), 'utf8');
		const [выход] = Object.values(итог.метафайл.outputs);
		const пакеты = new Set();
		for (const [вход, доля] of Object.entries(выход.inputs)) {
			const звенья = вход.split(/[\\/]/);
			const начало = звенья.lastIndexOf('node_modules') + 1;
			if (начало === 0 || доля.bytesInOutput === 0) continue;
			пакеты.add(звенья[начало].startsWith('@') ? `${звенья[начало]}/${звенья[начало + 1]}` : звенья[начало]);
		}

		assert.ok(пакеты.has('@shikijs/primitive'), `разбор входов ослеп: ${[...пакеты].join(', ')}`);
		for (const пакет of пакеты) {
			assert.ok(лицензии.includes(`${пакет} `), `в LICENSE нет пакета ${пакет}`);
		}
		assert.ok(лицензии.includes('1c-syntax/vsc-language-1c-bsl'), 'происхождение грамматики BSL');
	} finally {
		fs.rmSync(каталог, { recursive: true, force: true });
	}
});
