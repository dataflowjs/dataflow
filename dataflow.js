(function () {
	'use strict';
	let $$components = {};
	let $$directives = {};
	let $$data = {};
	let $$watchers = {};
	let $$funcs = {};
	let $$attrCache = {};
	//let $$pathCache = {};
	let watcherIdLast = 0;
	let watchState = { '*': true, '#': false };

	function arrayFrom(nl) {
		for (var a = [], l = nl.length; l--; a[l] = nl[l]);
		return a;
	}

	function objectsEqual(obj1, obj2) {
		let keys1 = Object.keys(obj1);
		let keys2 = Object.keys(obj2);

		if (keys1.length === keys2.length) {
			return keys1.every(key => obj2.hasOwnProperty(key) && obj2[key] === obj1[key]);
		}

		return false;
	}

	function objectKeysEqual(obj1, obj2) {
		for (let k in obj1) {
			if (obj2[k] === undefined) {
				return false;
			}

			if (obj1[k] !== obj2[k]) {
				return false;
			}
		}

		return true;
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

		if (ctx === undefined) {
			return path;
		}

		let ctxCount = 0;
		for (let i = 0; i < path.length; i++) {
			let p = path[i];
			if (typeof p === 'string' && p.charAt(0) === '$') {
				let key;
				if (Array.isArray(ctx)) {
					key = ctx[ctxCount];
					ctxCount++;
				} else {
					key = ctx[p];
				}

				if (key === undefined && ctx.el !== undefined) {
					key = ctx.el.dataflow.context[p];
				}

				if (key === undefined) return;

				path[i] = key;
			}
		}

		return path;
	}

	function flow(watchers) {
		for (let i = 0; i < watchers.length; i++) {
			let w = watchers[i];
			if (w.args === undefined && w.path !== undefined) {
				w.fn(df.get(w.path, w));
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
						flow: 'l',
						path: []
					};
					continue;

				case c === '&' && !isString:
					dynArg = {
						obj: obj,
						watch: false,
						flow: 'p',
						path: []
					};
					continue;

				case c === '.' && !isString && dynArg !== null:
					if (tmp === '') {
						dynArg.flow = 'g';
						continue;
					}
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
		let val = argParse(tmp);

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
		let args = $$attrCache[val];
		if (args === undefined) {
			args = df.parse(val);
			$$attrCache[val] = args;
		}

		return args;
	}

	let df = {
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

		func: function (name, fn) {
			if (fn === undefined) {
				return $$funcs[name];
			}

			$$funcs[name] = fn;
		},

		watcher: function (path, watcher) {
			path = pathPrepare(path, watcher);

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
							fn: watcher,
							path: path
						};
					}
					watcher.watcherId = ++watcherIdLast;
					tmp[path[i]].watchers.push(watcher);

					if (watcher.el !== undefined) {
						this.setup(watcher.el);

						watcher.el.dataflow.watchers.push({
							watcherId: watcher.watcherId,
							path: path
						});
					}
					return;
				}

				tmp = tmp[path[i]].keys;
			}
		},

		flow: function (path, ctx) {
			if (ctx === undefined) {
				ctx = {};
			}

			if (ctx.flow === 'none') {
				return;
			}

			path = pathPrepare(path, ctx);

			let len = path.length;
			let tmp = $$watchers;
			for (let i = 0; i < len; i++) {
				if (i < len - 1) {
					if (tmp[path[i]] === undefined) {
						return;
					}

					if (ctx.flow === 'before' || ctx.flow === 'all') {
						flow(tmp[path[i]].watchers);
					}

					if (ctx.flow === 'deep') {
						flowDeep(tmp[path[i]].keys);
						return;
					}

					tmp = tmp[path[i]].keys;

				} else {
					if (tmp[path[i]] !== undefined) {
						flow(tmp[path[i]].watchers);

						if (ctx.flow === 'after' || ctx.flow === 'all') {
							flowDeep(tmp[path[i]].keys);
						}
					}
				}
			}
		},

		inject: function (comp, stg) {
			if (stg === undefined) {
				stg = {};
			}

			let fn = $$components[comp];

			if (stg.comp !== undefined) {
				comp = stg.comp;
			}

			let ctx = {};

			ctx.comp = comp.split('.');

			ctx.watcher = function (path, fn) {
				fn = fn.bind(this);
				df.watcher(comp + (path ? '.' + path : ''), fn);
			}

			ctx.set = function (path, val, ctx) {
				df.set(comp + (path ? '.' + path : ''), val, ctx);
			}

			ctx.get = function (path, ctx) {
				return df.get(comp + (path ? '.' + path : ''), ctx);
			}

			ctx.func = function (name, fn) {
				if (this.funcs === undefined) {
					this.funcs = {};
				}
				this.funcs[name] = fn;
			}

			fn.call(ctx, stg);

			ctx.compCtx = ctx;
			this.set(comp, ctx);

			if (stg.el !== undefined) {
				ctx.el = stg.el;
			} else {
				ctx.el = document.querySelector(stg.root || ctx.root);
			}

			this.set(comp + '.init', true);

			ctx.el.insertAdjacentHTML('beforeend', ctx.template);

			this.exec(ctx);
			this.set(comp + '.ready', true);
		},

		exec: function (ctx) {
			if (ctx.el === undefined) {
				ctx.el = document.querySelector(ctx.root);
			}

			this.setup(ctx.el);

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

				this.setup(node);

				if (node.dataflow.omit) {
					continue;
				}

				if (node.dataflow.once) {
					node.dataflow.omit = true;
				}

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

					this.transfer(ctx, watcher);

					switch (an.charAt(0)) {
						case '@':
							watcher.args = this.parse(av);

							this.register(watcher);

							let eventName = an.slice(1);
							let eventFn = function () {
								df.prepare(watcher);
							};

							node.addEventListener(eventName, eventFn);

							watcher.el.dataflow.events.push({
								eventName,
								eventFn
							});

							break;

						case ':':
							// watcher.args = argsCache(av);
							watcher.args = this.parse(av);

							this.register(watcher);

							if (ctx.register || node.dataflow.register) {
								continue;
							}

							watcher.fn.apply(watcher, this.prepare(watcher));

							break;

						default:
					}
				}
			}
		},

		set: function (path, val, ctx) {
			let self = this;

			if (typeof ctx !== 'object') {
				ctx = [];
				for (let i = 2; i < arguments.length; i++) {
					ctx.push(arguments[i]);
				}
			}

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

			if (typeof ctx !== 'object') {
				ctx = [];
				for (let i = 2; i < arguments.length; i++) {
					ctx.push(arguments[i]);
				}
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

		unset: function (path, ctx) {
			let self = this;
			path = pathPrepare(path, ctx);

			if (path === undefined) {
				return;
			}

			if (typeof ctx !== 'object') {
				ctx = [];
				for (let i = 2; i < arguments.length; i++) {
					ctx.push(arguments[i]);
				}
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

					self.flow(path, ctx);
				}
			}
		},

		clean: function (el, ctx) {
			if (typeof el === 'string') {
				el = document.querySelector(el);
			}

			let els = [];
			if (ctx !== undefined && ctx.container) {
				els = [el];
			}

			if (ctx !== undefined && ctx.deep !== undefined) {
				let nodes = el.querySelectorAll('*');
				let len = nodes.length;
				for (let i = 0; i < len; i++) {
					els.push(nodes[i]);
				}
			}

			let unset = false;
			if (ctx !== undefined && ctx.data) {
				unset = true;
			}

			for (let i = 0; i < els.length; i++) {
				el = els[i];

				if (el.dataflow === undefined) {
					continue;
				}

				if (el.dataflow.events !== undefined) {
					for (let i1 = 0; i1 < el.dataflow.events.length; i1++) {
						let e = el.dataflow.events[i1];
						el.removeEventListener(e.eventName, e.eventFn);
					}

					el.dataflow.events = [];
				}

				if (el.dataflow.watchers === undefined) {
					continue;
				}

				for (let i1 = 0; i1 < el.dataflow.watchers.length; i1++) {
					let w = el.dataflow.watchers[i1];
					let len = w.path.length;
					let tmp = $$watchers;
					for (let i2 = 0; i2 < len; i2++) {
						if (tmp[w.path[i2]].len === 1) {
							delete tmp[w.path[i2]];
							if (unset) {
								this.unset(w.path.slice(0, i2 + 1));
							}
							break;
						}

						tmp[w.path[i2]].len--;
						if (i2 === len - 1) {
							for (let i3 = 0; i3 < tmp[w.path[i2]].watchers.length; i3++) {
								let w1 = tmp[w.path[i2]].watchers[i3];
								if (w.watcherId === w1.watcherId) {
									tmp[w.path[i2]].watchers.splice(i3, 1);
								}
							}
							continue;
						}

						tmp = tmp[w.path[i2]].keys;
					}
				}

				el.dataflow.watchers = [];
			}
		},

		remove: function (el, ctx) {
			if (typeof el === 'string') {
				el = document.querySelector(el);
			}

			this.clean(el, ctx);

			while (el.firstChild) {
				el.removeChild(el.lastChild);
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

				if ((w.flow === 'l' || w.flow === 'p') && watcher.compCtx !== undefined) {
					let len = watcher.compCtx.comp.length;
					while (len--) {
						w.path.unshift(watcher.compCtx.comp[len]);
					}
				}

				if (!w.watch) {
					continue;
				}

				df.watcher(w.path, watcher);
			}
		},

		prepare: function (watcher) {
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
						s.obj[s.pos] = watcher.ctx[s.name] !== undefined ? watcher.ctx[s.name] : watcher.el.dataflow.keys[s.name];
				}
			}

			for (let i = 0; i < watcher.args.watchers.length; i++) {
				let o = watcher.args.watchers[i];
				if (o.flow !== 'p') {
					o.obj[o.pos] = df.get(o.path, watcher);
				} else {
					o.obj[o.pos] = o.path;
				}
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

		setup: function (el) {
			if (el.dataflow === undefined) {
				el.dataflow = {};
			}

			if (el.dataflow.watchers === undefined) {
				el.dataflow.watchers = [];
			}

			if (el.dataflow.context === undefined) {
				el.dataflow.context = {};
			}

			if (el.dataflow.events === undefined) {
				el.dataflow.events = [];
			}

			if (el.dataflow.directives === undefined) {
				el.dataflow.directives = {};
			}
		},

		transfer: function (from, to) {
			if (to === undefined) {
				to = {};
			}

			if (from.compCtx !== undefined) {
				to.compCtx = from.compCtx;
			}

			for (let k in from.el.dataflow.context) {
				to.el.dataflow.context[k] = from.el.dataflow.context[k];
			}

			return to;
		},

		assign: function () {
			return Object.assign({}, df.get(arrayFrom(arguments)));
		}
	};

	df.func('set', function () {
		let args = arrayFrom(arguments);
		if (args.length == 2) {
			args.push(this);
		}
		df.set.apply(df, args);
	});

	df.func('stringify', function (val) {
		return JSON.stringify(val);
	});

	df.func('concat', function () {
		return arrayFrom(arguments).join('');
	});

	df.func('not', function (val) {
		return !val;
	});

	df.func('empty', function (val) {
		if (val) {
			return false;
		}
		return true;
	});

	df.func('eq', function (v1, v2) {
		return v1 === v2;
	});

	df.func('ne', function (v1, v2) {
		return v1 !== v2;
	});

	df.func('int', function (val) {
		return parseInt(val);
	});

	df.func('float', function (val) {
		return parseFloat(val);
	});

	df.func('if', function () {
		let args = arrayFrom(arguments);
		let state = args.shift();
		if (state) {
			let fn = args.shift();
			if (this.ctx.funcs !== undefined && this.ctx.funcs[fn] !== undefined) {
				return this.ctx.funcs[fn].apply(this, args);
			}

			return df.func(fn).apply(this, args);
		}
	});

	df.func('ifr', function () {
		let args = arrayFrom(arguments);
		let state = args.shift();
		if (state) {
			return args;
		}
	});

	df.func('class', function (action, class1, val, class2) {
		switch (action) {
			case 'toggle':
				if (val) {
					this.el.classList.add(class1);
					return;
				}
				this.el.classList.remove(class1);
				break;

			case 'switch':
				if (val) {
					this.el.classList.remove(class1);
					this.el.classList.add(class2);
					return;
				}
				this.el.classList.remove(class2);
				this.el.classList.add(class1);
				break;
		}
	});

	df.func('classTrue', function () {
		let args = arrayFrom(arguments);
		if (args[0]) {
			for (let i = 1; i < args.length; i++) {
				this.el.classList.add(args[i]);
			}
			return;
		}

		for (let i = 1; i < args.length; i++) {
			this.el.classList.remove(args[i]);
		}
	});

	df.func('classFalse', function () {
		let args = arrayFrom(arguments);
		args[0] = !args[0];
		df.func('classTrue').apply(this, args);
	});

	df.directive('noop', function () { });

	df.directive('text', function (val, defVal) {
		this.el.textContent = val || defVal;
	});

	df.directive('attr', function (access, name, value) {
		if (access) {
			this.el.setAttribute(name, value);
		}
	});

	df.directive('rowspan', function (access, value) {
		if (access) {
			this.el.setAttribute('rowspan', value);
			return;
		}

		df.remove(this.el, { container: true, deep: true });
		this.el.parentElement.removeChild(this.el);
	});

	df.directive('component', function (name, params) {
		if (params === undefined) {
			params = {};
		}
		params.el = this.el;
		df.transfer(this, params);
		df.inject(name, params);
	});

	df.directive('range', function (val, stg) {
		if (typeof stg === 'string') {
			stg = {
				key: stg
			};
		}
		// console.time('range');
		let directives = this.el.dataflow.directives;
		if (directives.range === undefined) {
			directives.range = {};
		}

		let range = directives.range;

		if (range.el === undefined) {
			let firstChild = this.el.firstElementChild
			range.el = firstChild.cloneNode(true);

			let nodes = this.el.querySelectorAll('*');
			for (let i = 0; i < nodes.length; i++) {
				let node = nodes[i];
				df.setup(node);
				node.dataflow.omit = true;
			}

			this.el.removeChild(firstChild);

			range.el.classList.remove('df-hide');
		}

		let dataRemove = false;
		if (stg !== undefined && stg.data !== undefined) {
			dataRemove = true;
		}

		let keyName;
		if (stg !== undefined && stg.key !== undefined) {
			keyName = stg.key;
		}

		df.remove(this.el, { data: dataRemove, deep: true });

		if (range.fn === undefined) {
			range.fn = function (self, key, val) {
				let clone = range.el.cloneNode(true);
				df.setup(clone);

				let ctx = {};
				ctx.el = clone;

				self.el.dataflow.context[key] = val;

				let nodes = ctx.el.querySelectorAll('*');
				for (let i = 0; i < nodes.length; i++) {
					let node = nodes[i];
					df.setup(node);

					for (let k in self.el.dataflow.context) {
						node.dataflow.context[k] = self.el.dataflow.context[k];
					}
				}

				ctx.container = true;

				df.transfer(self, ctx);

				df.exec(ctx);

				self.el.insertAdjacentElement('beforeend', clone);
			}
		}

		switch (true) {
			case Array.isArray(val):
				for (let i = 0; i < val.length; i++) {
					range.fn(this, keyName || '$index', i);
				}
				break;

			case typeof val === 'object':
				for (let k in val) {
					range.fn(this, keyName || '$key', k);
				}
				break;
		}

		// console.timeEnd('range');
	});

	df.directive('hide', function (val, dir) {
		if (val === undefined) {
			return;
		}

		if (dir !== undefined) {
			if (val === dir) {
				this.el.classList.add('df-hide');
				return;
			}

			this.el.classList.remove('df-hide');
			return;
		}

		if (val) {
			this.el.classList.add('df-hide');
			return;
		}

		this.el.classList.remove('df-hide');
	});

	df.directive('show', function (val, dir) {
		if (val === undefined) {
			return;
		}

		df.directive('hide').call(this, !val, dir);
	});

	df.directive('class', df.func('class'));
	df.directive('class.true', df.func('classTrue'));
	df.directive('class.false', df.func('classFalse'));

	df.directive('if', df.func('if'));

	df.directive('context', function (keys) {
		let directives = this.el.dataflow.directives;
		if (directives.context === undefined) {
			directives.context = {};
		}

		let context = directives.context;

		if (!context.init) {
			context.init = true;
			context.once = false;

			for (let k in keys) {
				this.el.dataflow.context[k] = keys[k];
			}

			let nodes = this.el.querySelectorAll('*');
			for (let i = 0; i < nodes.length; i++) {
				let node = nodes[i];

				for (let k in keys) {
					node.dataflow.context[k] = keys[k];
				}
			}
			return;
		}

		if (context.once) {
			context.once = false;
			return;
		}
		context.once = true;

		if (objectKeysEqual(keys, this.el.dataflow.context)) {
			context.once = false;
			return;
		}

		for (let k in keys) {
			this.el.dataflow.context[k] = keys[k];
		}

		let nodes = this.el.querySelectorAll('*');

		for (let i = 0; i < nodes.length; i++) {
			let node = nodes[i];

			for (let k in keys) {
				node.dataflow.context[k] = keys[k];
			}
		}

		df.clean(this.el, {
			container: true,
			deep: true
		});

		let ctx = df.transfer(this, { el: this.el });
		ctx.container = true;

		df.exec(ctx);

		context.once = false;
	});

	df.directive('log', function () {
		console.log(arguments);
	});

	document.addEventListener("DOMContentLoaded", function () {
		df.set('dataflow.ready', true);
		console.log($$watchers);
		console.log($$data);
	});

	this.df = df;

}.call(this));