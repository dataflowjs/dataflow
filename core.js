let $$components = {};
let $$directives = {};
let $$data = {};
let $$watchers = {};
let $$funcs = {};
let $$attrCache = {};
let $$pathCache = {};
let watcherIdLast = 0;
let watchState = { '*': true, '#': false };

function arrayFrom(nl) {
	for (var a = [], l = nl.length; l--; a[l] = nl[l]);
	return a;
}

const isNumeric = (num) => (typeof (num) === 'number' || typeof (num) === 'string' && num.trim() !== '') && !isNaN(num);
const isBool = (val) => {
	if (typeof (val) != 'string') {
		return false;
	}
	val = val.toLowerCase();
	return val === 'true' || val === 'false';
};

function pathPrepare(path, ctx) {
	if (typeof path === 'string') {
		path = path.split('.');
	}

	for (let i = 0; i < path.length; i++) {
		let p = path[i];
		if (typeof p === 'string' && p.charAt(0) === '$') {
			if (ctx[p] === undefined) {
				return;
			}
			path[i] = ctx[p];
		}
	}

	if (ctx !== undefined) {
		ctx.prepared = true;
	}

	return path;
}

function flow(watchers) {
	for (let i = 0; i < watchers.length; i++) {
		let w = watchers[i];
		if (typeof w === 'function') {
			w();
		} else {
			let args = df.prepare(w);
			if (w.fn !== undefined) {
				w.fn.apply(w, args);
			}
		}
	}
}

function flowDeep(keys) {
	for (let k in keys) {
		let obj = keys[k];
		flow(obj.watchers);
		flowDeep(obj.keys);
	}
}

function parse(obj, str, i, dynamicArgs, funcs, sysArgs) {
	let tmp = '';
	let objKey = null;
	let isString = false;
	let dynArg = null;
	let fn = null;
	let isSysArg = false;

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
				i = parse(tmp, str, i + 1, dynamicArgs, funcs, sysArgs);
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

				if (dynArg === null && isSysArg) {
					sysArgs.push({
						obj: obj,
						name: tmp,
						pos: objKey || obj.length
					});
					isSysArg = false;
				}

				argAdd(obj, tmp, objKey);

				dynArg = null;
				tmp = '';
				objKey = null;
				if (c === ',' || c === ';') continue;
				return i;

			case c === '{' && !isString:
				tmp = {};
				i = parse(tmp, str, i + 1, dynamicArgs, funcs, sysArgs);
				continue;

			case c === ':' && !isString:
				argAdd(obj, tmp, objKey);
				objKey = tmp;
				tmp = '';
				isSysArg = false;
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
				i = parse(tmp, str, i + 1, dynamicArgs, funcs, sysArgs);
				fn.args = tmp;
				funcs.push(fn);
				fn = null;
				tmp = undefined;
				continue;

			case c === '$' && !isString:
				tmp += c;
				if (dynArg === null) {
					isSysArg = true;
				}
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

	if (dynArg === null && isSysArg) {
		sysArgs.push({
			obj: obj,
			name: tmp,
			pos: objKey || obj.length
		});
		isSysArg = false;
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

function argsCache(val) {
	args = $$attrCache[val];
	if (args === undefined) {
		args = df.parse(val);
		$$attrCache[val] = args;
	}

	return args;
}

let df = {
	arrayFrom: arrayFrom,

	component: function (name, fn) {
		if (fn === undefined) {
			return $$components[name];
		}
		$$components[name] = fn;
	},

	directive: function (name, fn) {
		if (fn === undefined) {
			return $$directives[':' + name];
		}
		$$directives[':' + name] = fn;
	},

	watcher: function (path, watcher) {
		path = pathPrepare(path, watcher.ctx);

		if (path === undefined) {
			return;
		}

		let len = path.length;
		let tmp = $$watchers;
		for (let i = 0; i < len; i++) {
			if (path[i] === undefined) {
				return;
			}
			if (tmp[path[i]] === undefined) {
				tmp[path[i]] = {
					len: 0,
					watchers: [],
					keys: {}
				};
			}

			tmp[path[i]].len++;

			if (i === len - 1) {
				if (typeof watcher === 'function') {
					watcher = {
						fn: watcher
					};
				}
				watcher.watcherId = ++watcherIdLast;
				tmp[path[i]].watchers.push(watcher);

				if (watcher.el !== undefined) {
					if (watcher.el.dataflow === undefined) {
						watcher.el.dataflow = {};
						if (watcher.el.dataflow.watchers === undefined) {
							watcher.el.dataflow.watchers = [{
								watcherId: watcher.watcherId,
								path: path
							}];
						};

					}
				}
				return;
			}

			tmp = tmp[path[i]].keys;
		}
	},

	unset: function (path) {
		if (path === undefined) {
			return;
		}

		let len = path.length;
		let tmp = $$data;
		for (let i = 0; i < len; i++) {
			if (i < len - 1) {
				if (tmp[path[i]] === undefined) {
					return;
				}
				tmp = tmp[path[i]];
			} else {
				delete tmp[path[i]];
			}
		}
	},

	clean: function (el, ctx) {
		if (el.dataflow === undefined || el.dataflow.watchers === undefined) {
			return;
		}

		let unset = true;
		if (ctx !== undefined && ctx.data === false) {
			unset = false;
		}

		for (let i = 0; i < el.dataflow.watchers.length; i++) {
			let w = el.dataflow.watchers[i];
			let len = w.path.length;
			let tmp = $$watchers;
			for (let i = 0; i < len; i++) {
				if (tmp[w.path[i]].len === 1) {
					delete tmp[w.path[i]];
					if (unset) {
						this.unset(w.path.slice(0, i + 1));
					}
					break;
				}

				tmp[w.path[i]].len--;

				if (i === len - 1) {
					for (let i1 = 0; i1 < tmp[w.path[i]].watchers.length; i1++) {
						let w1 = tmp[w.path[i]].watchers[i1];
						if (w.watcherId === w1.watcherId) {
							tmp[w.path[i]].watchers.splice(i1, 1);
						}
					}
					break;
				}

				tmp = tmp[w.path[i]].keys;
			}
		}
	},

	remove: function (el, ctx) {
		let self = this;

		if (typeof el === 'string') {
			el = document.querySelector(el);
		}

		if (ctx !== undefined && ctx.container) {
			self.clean(el, ctx);
		}

		el.querySelectorAll('*').forEach(function (node) {
			self.clean(node, ctx);
			node.parentNode.removeChild(node);
		});
	},

	func: function (name, fn) {
		if (fn === undefined) {
			return $$funcs[name];
		}

		$$funcs[name] = fn;
	},

	set: function (path, val, ctx) {
		let self = this;
		path = pathPrepare(path, ctx);

		if (path === undefined) {
			return;
		}

		let len = path.length;
		let tmp = $$data;
		for (let i = 0; i < len; i++) {
			if (i < len - 1) {
				if (tmp[path[i]] === undefined) {
					tmp[path[i]] = {};
				}
				tmp = tmp[path[i]];
			} else {
				tmp[path[i]] = val;
			}
		}

		self.flow(path, ctx);
	},

	get: function (path, ctx) {
		path = pathPrepare(path, ctx);

		if (path === undefined) {
			return;
		}

		let len = path.length;

		let tmp = $$data;
		for (let i = 0; i < len; i++) {
			if (i < len - 1) {
				if (tmp[path[i]] === undefined) {
					return;
				}
				tmp = tmp[path[i]];
			} else {
				return tmp[path[i]];
			}
		}
	},

	flow: function (path, ctx) {
		// console.time('flow');
		if (ctx !== undefined && ctx.flow === 'none') {
			return;
		}

		if (ctx !== undefined && ctx.prepared !== true) {
			path = pathPrepare(path, ctx);
			if (path === undefined) {
				return;
			}
			ctx.prepared = false;
		}

		let len = path.length;
		let tmp = $$watchers;
		for (let i = 0; i < len; i++) {
			if (i < len - 1) {
				if (tmp[path[i]] === undefined) {
					return;
				}
				if (ctx !== undefined && (ctx.flow === 'before' || ctx.flow === 'all')) {
					flow(tmp[path[i]].watchers);
				}
				tmp = tmp[path[i]].keys;
			} else {
				if (tmp[path[i]] !== undefined) {
					flow(tmp[path[i]].watchers);
					if (ctx !== undefined && (ctx.flow === 'after' || ctx.flow === 'all')) {
						flowDeep(tmp[path[i]].keys);
					}
				}
			}
		}
		// console.timeEnd('flow');
	},

	inject: function (comp, stg) {
		if (stg === undefined) {
			stg = {};
		}

		let fn = $$components[comp];

		if (stg.comp !== undefined) {
			comp = stg.comp;
		}

		let el = {};

		let ctx = {
			comp: comp.split('.'),
			watcher: function (path, fn) {
				df.watcher(comp + (path ? '.' + path : ''), {
					el: el,
					fn: fn
				});
			},

			set: function (path, val, ctx) {
				df.set(comp + (path ? '.' + path : ''), val, ctx);
			},

			get: function (path, ctx) {
				return df.get(comp + (path ? '.' + path : ''), ctx);
			}
		};

		ctx.func = function (name, fn) {
			if (ctx.funcs === undefined) {
				ctx.funcs = {};
			}
			ctx.funcs[name] = fn;
		}



		fn.call(ctx, stg);

		this.set(comp, ctx);
		this.set(comp + '.init', true);

		if (stg.el !== undefined) {
			ctx.el = stg.el;
		} else {
			ctx.el = document.querySelector(stg.root || ctx.root);
		}

		ctx.el.dataflow = el.dataflow;
		ctx.el.innerHTML = ctx.template;

		this.exec(ctx);
		this.set(comp + '.ready', true);
	},

	exec: function (ctx) {
		if (ctx.el === undefined) {
			ctx.el = document.querySelector(ctx.root);
		}

		let els = [];

		if (ctx.container) {
			els.push(ctx.el);
		}

		let nodes = ctx.el.querySelectorAll('*');
		let len = nodes.length;
		for (let i = 0; i < len; i++) {
			els.push(nodes[i]);
		}

		len = els.length;
		for (let i = 0; i < len; i++) {
			let node = els[i];
			let attrs = node.attributes;
			let len1 = attrs.length;
			for (let i1 = 0; i1 < len1; i1++) {
				let an = attrs[i1].name
				let av = attrs[i1].value;

				let watcher = {
					el: node,
					fn: $$directives[an],
					ctx: ctx
				};

				switch (an.charAt(0)) {
					case '@':

						watcher.args = df.parse(av);
						df.register(watcher);

						node.addEventListener(an.slice(1), function () {
							df.prepare(watcher);
						});

						break;

					case ':':
						if ($$directives[an] === undefined) {
							return;
						}

						// watcher.args = argsCache(av);
						watcher.args = df.parse(av);

						df.register(watcher);

						if (watcher.register === true) {
							watcher.register = false;
							continue;
						}

						watcher.fn.apply(watcher, df.prepare(watcher));

						break;

					default:
				}
			}
		}
	},

	parse: function (str) {
		let result = {
			obj: [],
			watchers: [],
			funcs: [],
			sys: []
		};

		parse(result.obj, str, 0, result.watchers, result.funcs, result.sys);

		return result;
	},

	register: function (watcher) {
		for (let i = 0; i < watcher.args.watchers.length; i++) {

			let w = watcher.args.watchers[i];

			if (w.flow === 'local' && watcher.ctx.comp !== undefined) {
				let len = watcher.ctx.comp.length;
				while (len--) {
					w.path.unshift(watcher.ctx.comp[len]);
				}
			}

			if (!w.watch) {
				continue;
			}

			df.watcher(w.path, watcher);
		}
	},

	sys: function (watcher) {
		if (watcher.args === undefined) {
			return;
		}

		for (let i = 0; i < watcher.args.sys.length; i++) {
			let s = watcher.args.sys[i];
			switch (s.name) {
				case '$watcher':
					s.obj[s.pos] = watcher;
					break;

				case '$root':
					s.obj[s.pos] = watcher.ctx.el;

				case '$this':
					s.obj[s.pos] = watcher.el;
					break;

				case '$value':
					s.obj[s.pos] = watcher.el.value;
					break;

				case '$text':
					s.obj[s.pos] = watcher.el.textContent;
					break;

				default:
					s.obj[s.pos] = watcher.ctx[s.name];
			}
		}
	},

	prepare: function (watcher) {
		this.sys(watcher);

		if (watcher.args === undefined) {
			return;
		}

		for (let i = 0; i < watcher.args.watchers.length; i++) {
			let o = watcher.args.watchers[i];
			o.obj[o.pos] = df.get(o.path, watcher.ctx);
		}

		for (let i = 0; i < watcher.args.funcs.length; i++) {
			let f = watcher.args.funcs[i];

			let fn;
			if (watcher.ctx !== undefined && watcher.ctx.funcs !== undefined && watcher.ctx.funcs[f.name] !== undefined) {
				fn = watcher.ctx.funcs[f.name];
			} else {
				fn = this.func(f.name);
			}

			f.obj[f.pos] = fn.apply(watcher, f.args);
		}

		return watcher.args.obj;
	},

	transfer: function (w1, w2) {
		if (w2.ctx.comp !== undefined) {
			w1.comp = w2.ctx.comp;
		}
		w1.funcs = w2.ctx.funcs;
		w1.set = w2.ctx.set;
		w1.get = w2.ctx.get;
	}
};