/* OpenHub — подсветка кода BSL в README пакета. Ванильный JS без сборки, как openhub.js.
 *
 * Раскрашивает блоки bsl и 1c внутри [data-highlight] движком shiki, чей адрес — значение
 * признака (движок собирает tools/подсветка). Грузит его, только когда есть что раскрасить;
 * отказ движка оставляет код обычным текстом. Токены становятся узлами DOM, а не строкой
 * для innerHTML: код пришёл из чужого README.
 */
(function () {
	'use strict';

	var языкПоКлассу = { 'language-bsl': 'bsl', 'language-1c': '1c' };

	// блок длиннее — чужие данные, а не пример кода: раскраска держала бы вкладку зря
	var пределДлиныБлока = 20000;

	// язык блока по его классу без оглядки на регистр; null — блок не наш
	function языкБлока(код) {
		var классы = (код.getAttribute('class') || '').toLowerCase().split(/\s+/);
		for (var и = 0; и < классы.length; и += 1) {
			if (языкПоКлассу.hasOwnProperty(классы[и])) { return языкПоКлассу[классы[и]]; }
		}
		return null;
	}

	// строчный код вне <pre> — это слово в тексте, а не блок кода
	function блокиОбласти(область) {
		var блоки = [];
		Array.prototype.forEach.call(область.querySelectorAll('pre > code'), function (код) {
			var язык = языкБлока(код);
			if (язык && код.textContent.length <= пределДлиныБлока) {
				блоки.push({ код: код, язык: язык });
			}
		});
		return блоки;
	}

	function разметка(строки) {
		var фрагмент = document.createDocumentFragment();
		строки.forEach(function (строка, номер) {
			if (номер > 0) { фрагмент.appendChild(document.createTextNode('\n')); }
			строка.forEach(function (токен) {
				var кусок = document.createElement('span');
				кусок.textContent = токен.content;
				кусок.style.color = токен.color;
				фрагмент.appendChild(кусок);
			});
		});
		return фрагмент;
	}

	function текстТокенов(строки) {
		return строки.map(function (строка) {
			return строка.map(function (токен) { return токен.content; }).join('');
		}).join('\n');
	}

	// код заменяется, только если движок справился и его токены сложились в тот же текст
	function раскрасить(блок, движок) {
		var исходный = блок.код.textContent;
		try {
			var строки = движок.токены(исходный, блок.язык);
			if (текстТокенов(строки) !== исходный) { return; }
			var раскрашенный = разметка(строки);
			блок.код.textContent = '';
			блок.код.appendChild(раскрашенный);
		} catch (сбой) {
			// с этим блоком движок не справился: он остаётся текстом, соседи — нет
		}
	}

	// по блоку за задачу: между блоками вкладка отвечает, как бы длинен ни был README
	function раскраситьПоОдному(блоки, движок, номер) {
		if (номер >= блоки.length) { return; }
		раскрасить(блоки[номер], движок);
		setTimeout(function () { раскраситьПоОдному(блоки, движок, номер + 1); }, 0);
	}

	function оживить(область) {
		var блоки = блокиОбласти(область);
		if (блоки.length === 0) { return; }
		import(область.getAttribute('data-highlight')).then(function (движок) {
			раскраситьПоОдному(блоки, движок, 0);
		}, function () {
			// движок не приехал: старый браузер или сеть — код остаётся текстом
		});
	}

	function запустить() {
		Array.prototype.forEach.call(document.querySelectorAll('[data-highlight]'), оживить);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', запустить);
	} else {
		запустить();
	}
})();
