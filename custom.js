df.func('set', function (path, val, ctx) {
	if (ctx === undefined || ctx.auto !== false) {
		path = this.args.watchers[0].path;
	}

	df.set(path, val, ctx);
});

df.func('stringify', function (val) {
	return JSON.stringify(val);
});

df.func('concat', function () {
	return df.arrayFrom(arguments).join('');
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
	return parseInt(val);
});

df.func('if', function () {
	let args = df.arrayFrom(arguments);
	let state = args.shift();
	if (state) {
		let fn = args.shift();
		if (this.ctx.funcs !== undefined && this.ctx.funcs[fn] !== undefined) {
			return this.ctx.funcs[fn].apply(this, args);
		}

		return df.func(fn).apply(this, args);
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

df.directive('text', function (val, defVal) {
	this.el.textContent = val || defVal;
});

df.directive('component', function (name, params) {
	if (params === undefined) {
		params = {};
	}
	params.el = this.el;
	df.inject(name, params);
});

df.directive('repeat', function (val) {
	// console.time('repeat');
	if (this.el.dataflow === undefined) {
		this.el.dataflow = {};
	}

	if (this.el.dataflow.repeat === undefined) {
		this.el.dataflow.repeat = {};
	}

	let repeat = this.el.dataflow.repeat;

	if (repeat.el === undefined) {
		repeat.el = this.el.removeChild(this.el.firstElementChild);
		repeat.el.classList.remove('df-hide');
	}

	df.remove(this.el, { data: false });

	if (repeat.fn === undefined) {
		repeat.fn = function (self, key, val) {
			let ctx = {};
			if (self.ctx.comp !== undefined) {
				ctx.comp = self.ctx.comp;
			}

			let clone = repeat.el.cloneNode(true);
			ctx.el = clone;
			ctx[key] = val;
			ctx.container = true;
			df.transfer(ctx, self);
			self.el.insertAdjacentElement('beforeend', clone);
			df.exec(ctx);
		}
	}

	switch (true) {
		case Array.isArray(val):
			for (let i = 0; i < val.length; i++) {
				repeat.fn(this, '$index', i);
			}
			break;

		case typeof val === 'object':
			for (let k in val) {
				repeat.fn(this, '$key', k);
			}
			break;
	}

	// console.timeEnd('repeat');
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

df.directive('if', df.func('if'));