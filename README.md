# Introduction

The idea is to create a simple, fast and powerful JS framework with a quick development start.
\
The framework is based on the foundation that everything in our world is data, namely data flow. We can name this data with paths and access it.

### Functionality

- Data binding
- Reuse of components
- Directives
- Functions

### Simple example

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Basic</title>
  </head>

  <body id="app">
    <button @click="@set(&.binding.path, 'Welcome to pathfinder.js!')">
      Click
    </button>
    <div :text="*binding.path, 'default text'"></div>

    <script src="/pathfinder.js"></script>
    <script>
      pf.exec({ root: "#app" });
    </script>
  </body>
</html>
```

### Examples

https://github.com/dataflowjs/pathfinder/tree/main/examples

# Documentation

### path

This is the path in the object separated by a dot, for example path `"user.profile.name"` in the object will be

```javascript
{
  user: {
    profile: {
      name: "";
    }
  }
}
```

### template

`@` - this is event.
\
`: `- this is directive.

```html
<button @click="@somefunc()"></button>
<div :text="*some.path'"></div>
```

##### watcher

`*` - places the watcher and passes the value to the function or directive.
\
`#` - does not place a watcher, but passes a value to a function or directive.
\
`&` - does not place a watcher or pass a value, but passes path as an array.
\
`~` - specifies the global path. Used in html template inside `pf.component(name, fn)` to point to data outside component (global).
\
\
Possible combinations watcher:

```html
<div :log="*some.path"></div>
// watcher + value by this path
<div :log="#some.path"></div>
// only value by this path
<div :log="*~some.path"></div>
// watcher + value by this path globaly (outside of component)
<div :log="#~some.path"></div>
// only value by this path globaly (outside of component)
<div :log="&some.path"></div>
// path as array ['some', 'path']
```

You can specify in the template (at this moment):
\
`"123"` - number
\
`"1.3"` - number
\
`"'string'"` - string
\
`"true"` - bool
\
`"[1,'2',true]"` - array
\
`"{key: value}"` - object
\
`"@somefunc()"` - function
\
`"*some.path"` - watcher

```html
<div :log="123"></div>
<div :log="'string'"></div>
<div :log="{something: true}">
  <div :log="@somefunc()"></div>
</div>
```

> watcher can NOT be an object key!

You can also combine arguments separated by commas:

```html
<div
  :log="{something: *some.path}, 123, ['a', 'b'], {a: [1,2,3], b: true}"
></div>
<div
  :log="@somefunc(123, @somefunc(321, *somepath)), @somefunc({key: *some.path}, 'string')"
></div>
// etc.
```

### pf.watcher (path, watcher)

This is the watcher that will be fired when there are changes to the data in the specified path.

```javascript
pf.watcher("path", function (value) {
  // something
});
```

`value` is the new data that the function will receive at this path.
\
Any path can be watched by any number of watchers.

### pf.set (path, value, ctx)

Creates or modifies data at the specified path and runs `pf.flow(path, ctx)` , watchers which in turn modify something on the page or the data itself and pass it on to another path. Another watcher can change the data of other paths and a certain chain of data flow is obtained.

```javascript
df.set("path", "dataflow.js is simple"); // {path: 'dataflow.js is simple'}
df.set("path1.new", true); // {path1: {new: true}}
df.set("table.filter.row.set", [1, 2, 3]); // {table: {filter: {row: {set : [1,2,3]}}}}
//...
```

In the `ctx` object, you can specify the `flow` property see `pf.flow(path, ctx)`

### pf.get(path, ctx)

Returns data at the specified path.

```javascript
let val = pf.get("path");
```

### pf.func(name, fn)

Adds a function that can later be used in the template.
\
If the `fn` parameter is not specified, then returns the function by name.

```javascript
pf.func("myFunc", function (val1, val2) {
  // val1 & val2 - is argument of pf.parse('true, *test.test');
  // something
  return val1 === val2;
});
```

```html
<div :text="@myFunc(true, *test.test)"></div>
// or
<button @focusout="@myFunc(true, false)">Click</button>
```

### pf.directive(name, fn)

Adds a directive that can later be used in the template.
\
If the `fn` parameter is not specified, then returns the directive by name.

```javascript
df.func("myDirective", function (val) {
  // val - its result of pf.parse() and pf.prepare();
  // something
  this.el.textContent = val;
  //this.el is element which use directive
  //console.log(this) for more info
});
```

```html
<div :myDirective="*.text"></div>
```

### pf.exec(ctx)

Iterates over all elements with `ctx.el.querySelectorAll('*')` parses attributes, registers and immediately executes directives!
\
If `ctx.el` is not present, then searches for the selector from `ctx.root` using `document.querySelector(ctx.root)`.
\
By default, `ctx.el` is not parsed, it is used as a container, but if you need to take into account the container itself, you can set the `container` property to `true`.

```html
<div id="someid" :someDirective="some settings">
  <span :text="*somepath.text, 'loading...'"></span>
  // another elements
</div>
```

```javascript
pf.exec({ root: "#someid" }); // {root: 'someid', container: true}
```

You can also skip registering and running directives, for example, if you need to do this not now, but in the future. To do this, you can create a `dataflow` object in the element itself with the `omit` property equal to `true`
\
Since `querySelectorAll('*)` bypasses the elements in order and the directives are immediately executed, we can take any next element from the NodeList, do something with it and set it to `element.pathfinder = {omit: true}` and when before this element reaches the queue, it will be skipped.

### pf.component(name, fn)

Creates a reusable component.
\
If `fn` is omitted, the method will return `fn` by `name`.
\
Also `name` is used as a prefix for the path within the component, i.e. `name` is used as a unique scope.

```javascript
pf.component("user", function () {
  this.root = "#app";
  this.template = `
		<div :text="*name"></div>
	`;
});
```

From the example above, the watcher path would be `user.name`.
\
To change data outside the component, you need to write the full path `pf.set('user.name', 'Artem')`.
\
The `this` context of the component has its own methods `set`, `get`, `watcher`, `func` which also automatically add the `name` prefix of the component to the path.

```javascript
pf.component("user", function (stg) {
  // ....
  this.set("name", "Java"); // equal path
  pf.set("user.name", "Script"); // equal path

  let x = this.get("name"); // user.name
  this.watch("name", function (val) {
    //user.name
    // ...
  });
  this.func("multiple", function (val, num) {
    return val * num;
    // <div :text="@multiple(*some.path, 3)"></div>
    // path is user.some.path
  });
});
```

In the example above, path is `user.name`.
\
When inserting a component into a page, it can be passed a `stg` object (settings).

```javascript
pf.component("user", function (stg) {
  let color = stg.color || "orange";
  this.root = "#app";
  this.template = `
		<div :text="*name" style="color: ${color}"></div>
	`;

  console.log(this); // for more details
});

pf.inject({
  // comp will create a new component 'user' with path prefix (scope) 'admin'
  comp: "admin",
  root: "#whatever", // will change container
  color: "green",
});
```

Before inserting the component on the page, before `el.innerHTML` there will be a call to `pf.set('init', true)`, and after insertion and processing of html, there will be a call to `pf.ready('ready', true)`
\
You can create a watcher for this data if needed.

```javascript
pf.component("user", function () {
  // ...
  this.watcher("init", function (val) {
    // something
  });
});
pf.watch("user.init", function (val) {
  // something
});
```

### pf.flow(path, ctx)

Starts watchers.
\
Called and gets `ctx` in the `pf.set(path, val, ctx)` method to trigger update of changes.

```javascript
pf.watch("somepath", function () {
  // something
  pf.set("somepath2", true);
});
pf.watch("somepath2", function (val) {
  // something
  console.log(val);
});
pf.flow("somepath");
// output
true;
```

The default is to start watchers at the end of path, as this is sufficient in most cases. For example if path is `user.profile.name` it will run watchers that watch the `name` property.
\
In the ctx object, you can specify the `flow` property, it can be 5 values ​​​​and usually it is specified (if necessary) in `pf.set(path, val, ctx)`:

- 'none'
- 'before'
- 'after'
- 'all'
- 'deep'

For example, there is such data:

```javascript
{
	project: {
		name: 'dataflow',
		other: {
			info: {
				from: 'something'
			},
			speed: 'tesla',
		}
};
```

If `{flow: 'none'}`:
That watchers will not be started.

```javascript
pf.watch("project.name", function (val) {
  //something
  console.log(val);
});
pf.flow("project.name", { flow: "none" });
```

If `{flow: 'before'}`:
\
That will start watchers all on the current path.
\
From the example below, it will launch watchers at the following paths:
\
'project'
\
'project.other'
\
'project.other.speed'

```javascript
pf.watch("project.other.speed", function (val) {
  //something
  console.log(val);
});
pf.flow("project.other.speed", { flow: "before" });
```

If `{flow: 'after'}`:
\
That will start watchers current and all to the right of the current path.
\
From the example below, it will launch watchers at the following paths:
\
'project.other.info'
\
'project.other.info.from'

```javascript
pf.watch("project.other.info", function (val) {
  //something
  console.log(val);
});
pf.flow("project.other.speed", { flow: "after" });
```

If `{flow: 'all'}`:
\
That will start watchers on the left along the path and on all possible paths on the right.
\
From the example below, it will launch watchers at the following paths:
\
'project'
\
'project.other'
\
'project.other.info'
\
'project.other.info.from'
\
'project.other.speed'

```javascript
pf.watch("project.other", function (val) {
  //something
  console.log(val);
});
pf.flow("project.other.speed", { flow: "all" });
```

If `{flow: 'deep'}`:
\
That will start watchers in all possible directions.
\
From the example below, it will launch watchers at the following paths:
\
'project'
\
'project.name'
\
'project.other'
\
'project.other.info'
\
'project.other.info.from'
\
'project.other.speed'

```javascript
pf.watch("project.other.speed.", function (val) {
  //something
  console.log(val);
});
pf.flow("project.other.speed", { flow: "all" });
```

### pf.unset(path)

Deletes data at the specified path.

```javascript
pf.unset("path");
```

### pf.clean(el, ctx)

Removes all watchers that are attached to the element.
\
If `el` is a string (selector), then `document.querySelector(el)` will run

```javascript
let el = document.querySelector("selector");
pf.clean(el);
// or
pf.clean("selector");
```

If the `ctx` object has a `data` property equal to `true`, it will also delete all the data watched by the watcher.

```html
<div id="el" :text="*some.path"></div>

<script>
  pf.set("some.path", "some string");
  pf.clean("#el", {
    data: true, // data under some.path will be removed
  });
</script>
```

### pf.remove(el, ctx)

Removes the element and all nested elements and calls `pf.clean(el, ctx)` for each element

```javascript
let el = document.querySelector("selector");
pf.remove(el);
// or
pf.remove("selector", { data: true });
```

### pf.parse(str)

> Often this method is not needed and is used very rarely!

Parses a string for later use.

```javascript
	let p = pf.parse('123, @func(true), {test: [1,2,3]}, $key');
	console.log(p);
	// output
	{
		obj: [ 123, undefined, [Object], '$key' ],
		watchers: [],
		funcs: [ [Object] ],
		sys: [ [Object] ]
  }
```

### pf.prepare(watcher)

> Often this method is not needed and is used very rarely!

Prepares the data to be passed to the directive.

```javascript
pf.func("func", function (val) {
  return !val;
});
pf.set("test.test", "asdf");
let s = pf.parse("123, *test.test, @func(true), {test: [1,2,3]}, $key");
let rs = pf.prepare({
  ctx: {
    $key: "someKey",
  },
  args: s,
});
console.log(rs);
// output
[123, "asdf", false, { test: [1, 2, 3] }, "someKey"];
```

### pf.register(watcher)

> Often this method is not needed and is used very rarely!

Adds watchers to other watchers.

```javascript
let p = pf.parse("*test.test, *user.name, #user.age");
pf.register(p); // добавит 2 наблюдателя
```

### pf.transfer(to, from)

> Often this method is not needed and is used very rarely!

Transfers the required data from the component to a new element.
\
When creating a new element inside a component or directive, it needs data to indicate which component it belongs to.

```javascript
pf.component("user", function () {
  this.root = "#app";
  this.template = `
		<button @click="@createElement()">New El</button>
	`;
  this.newElementText = "new element text";
  this.func("createElement", function () {
    let newEl = document.createElement("div");
    newEl.setAttribute(":text", "*newElementText");
    let ctx = {
      el: newEl,
      container: true,
    };
    pf.transfer(ctx, this);
    pf.exec(ctx);
    this.el.insertAdjacentElement("afterend", newEl); // this.el is button
  });
});
```

### Free to use

### If you can

USDT (TRC-20) TPjQKwmc3vBUhHuLiEhTCnr5gvJTZMvwc3
USDT (BEP-20) 0xCc06c2A652aB8D2F0B369472087AcF7152F11720
ETH (ERC-20) 0x848C4397A99323e65750F804F92A5ABF4e865Fb6
BTC (BTC) bc1q0xsfx74jlt307a77m6y9ckwqj8s8jdrj3vht7v

Thank you!
