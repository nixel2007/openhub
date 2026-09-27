// Вход бандла движка: shiki с одной грамматикой BSL (вместе с вложенным языком запросов)
// и темой css-variables. Цвет токена — var(--shiki-…), значения переменных даёт лист хаба.

import { codeToTokensBase, createShikiPrimitive } from '@shikijs/primitive';
import { createCssVariablesTheme } from '@shikijs/core';
import { createJavaScriptRawEngine } from '@shikijs/engine-javascript/raw';
import bsl from '@shikijs/langs-precompiled/bsl';

const тема = createCssVariablesTheme();

const подсветка = createShikiPrimitive({
	themes: [тема],
	langs: [bsl],
	engine: createJavaScriptRawEngine(),
});

// Токены кода по строкам: строка — массив { content, color, … }. Язык — bsl либо 1c.
export function токены(код, язык) {
	return codeToTokensBase(подсветка, код, { lang: язык, theme: тема.name });
}
