const isNumeric = (num) => (typeof (num) === 'number' || typeof (num) === 'string' && num.trim() !== '') && !isNaN(num);
const isBool = (val) => {
	if (typeof (val) != 'string') {
		return false;
	}
	val = val.toLowerCase();
	return val === 'true' || val === 'false';
};
let watchState = { '*': true, '#': false };

function parse(obj, str, i, dynamicArgs, funcs) {
	let tmp = '';
	let objKey = null;
	let isString = false;
	let dynArg = null;
	let fn = null;

	for (; i < str.length; i++) {
		let c = str[i];

		switch (true) {
			case c === ' ' && !isString:
				continue;

			case c === '\\' && isString:
				continue;

			case c === "'" && str[i - 1] != '\\':
				isString = !isString;
				tmp += "'";
				continue;

			case c === '[' && !isString:
				tmp = [];
				i = parse(tmp, str, i + 1, dynamicArgs, funcs);
				continue;

			case (c === ',' || c === ';' || c === ']' || c === '}' || c === ')') && !isString:
				if (dynArg !== null) {
					if (objKey === null) {
						dynArg.pos = obj.length;
					} else {
						dynArg.pos = objKey;
					}
					dynArg.path.push(tmp);
					dynamicArgs.push(dynArg);
					tmp = undefined;
				}
				argAdd(obj, tmp, objKey);
				dynArg = null;
				tmp = '';
				objKey = null;
				if (c === ',' || c === ';') continue;
				return i;

			case c === '{' && !isString:
				tmp = {};
				i = parse(tmp, str, i + 1, dynamicArgs, funcs);
				continue;

			case c === ':' && !isString:
				argAdd(obj, tmp, objKey);
				objKey = tmp;
				tmp = '';
				continue;

			case (c === '*' || c === '#') && !isString:
				dynArg = {
					obj: obj,
					watch: watchState[c],
					flow: 'local',
					path: []
				};
				continue;

			case c === '~' && !isString && dynArg !== null:
				dynArg.flow = 'global';
				continue;

			case c === '&' && !isString && dynArg !== null:
				dynArg.flow = 'comp';
				continue;

			case c === '.' && !isString && dynArg !== null:
				if (tmp === '') continue;
				dynArg.path.push(tmp);
				tmp = '';
				continue;

			case c === '@' && !isString && fn === null:
				fn = {};
				continue;

			case c === '(' && !isString && fn !== null:
				fn.obj = obj;
				fn.name = tmp;
				fn.pos = obj.length;
				tmp = [];
				i = parse(tmp, str, i + 1, dynamicArgs, funcs);
				fn.args = tmp;
				funcs.push(fn);
				tmp = undefined;
				continue;

			default:
				tmp += c;
		}
	}

	if (dynArg !== null) {
		if (objKey === null) {
			dynArg.pos = obj.length;
		} else {
			dynArg.pos = objKey;
		}
		dynArg.path.push(tmp);
		dynamicArgs.push(dynArg);
		tmp = undefined;
	}
	argAdd(obj, tmp, objKey);
	dynArg = null;
	tmp = '';
	objKey = null;

	return i;
}

function argParse(tmp) {
	if (tmp === undefined) return tmp;
	switch (true) {
		case tmp[0] === "'" && tmp[tmp.length - 1] === "'":
			return tmp.slice(1, -1);

		case isNumeric(tmp):
			return parseFloat(tmp);

		case isBool(tmp):
			return JSON.parse(tmp)

		default:
			return tmp;
	}
}

function argAdd(obj, tmp, key) {
	val = argParse(tmp);

	if (Array.isArray(obj)) {
		obj.push(val);
	} else {
		if (key === null) {
			obj[val] = undefined;
		} else {
			obj[key] = val;
		}
	}
}

var t0 = new Date();

let o = [], watchers = [], funcs = [];
parse(o, '1', 0);
console.log(o);
o = [];
parse(o, 'true', 0);
console.log(o);
o = [];
parse(o, "'[s\\'g]'", 0);
console.log(o);
o = [];
parse(o, 'true, [true, 2, 3]', 0);
console.log(o);
o = [];
parse(o, "[1, 2, 3], [4, '5', 6]; [true, 'a', 2.2]", 0);
console.log(o);
o = [];
parse(o, "{1: 1, 2: 2}; {1: 1, 2: 2}", 0);
console.log(o);
o = [];
parse(o, "[1, 2, 3]; {key: {key2: [1,2,3], key3: true}}", 0);
console.log(o, o[1].key);

o = []; watchers = [];
parse(o, '*.watch.test', 0, watchers);
console.log(o);
console.log(watchers);

o = []; watchers = [];
parse(o, '#.watch.test', 0, watchers);
console.log(o);
console.log(watchers);

o = []; watchers = [];
parse(o, '*&.watch.test', 0, watchers);
console.log(o);
console.log(watchers);

o = []; watchers = [];
parse(o, '#&.watch.test', 0, watchers);
console.log(o);
console.log(watchers);

o = []; watchers = [];
parse(o, '*~.watch.test', 0, watchers);
console.log(o);
console.log(watchers);

o = []; watchers = [];
parse(o, '#~.watch.test', 0, watchers);
console.log(o);
console.log(watchers);

o = []; watchers = [];
parse(o, '*.watch.test; #.watch.test', 0, watchers);
console.log(o);
console.log(watchers);

o = []; watchers = [];
parse(o, '{key1: [*.watch.test1, {ik1: *watch.test2, ik2: #watch.test3}], key2: #.watch.test}', 0, watchers);
console.log(o);
console.log(watchers);
console.log(funcs);

console.log('funcs');

o = []; watchers = []; funcs = [];
parse(o, '@i(1, #.test.test)', 0, watchers, funcs);
console.log(o);
console.log(watchers);
console.log(funcs);

o = []; watchers = []; funcs = [];
parse(o, '@increment(#.t1.t1, true, @increment(#.t2.t2, @increment(false, #.t3.t3)))', 0, watchers, funcs);
// parse(o, '@increment(1, @increment(2, @increment(3))) | @multiple(); @increment(1)', 0, watchers, funcs);
console.log(o);
console.log(watchers);
console.log(funcs);
// console.log(parse("@increment 1, true, 'string', [1,2,3], {key: value}, *config.test, .config.test", 0, [], 'array'));
// console.log(parse("@increment [1,2,3], 1, {key: value}", 0, [], 'array'));
// console.log(parse("@increment {&key: .value}, [1,2,3], 1 | @increment {key2: value2}, [1,2,3], 2", 0, [], 'array'));

var t1 = new Date();
console.log("time " + ((t1.getTime() - t0.getTime())) + " milliseconds.");