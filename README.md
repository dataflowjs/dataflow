# dataflow

The idea is to create a simple, fast and powerful JS framework with a quick development start.
\
Enjoy!

# Introduction

Hello, I'm from Ukraine, Kherson city. My country is under attack right now!
\
Now it is very difficult, many people ask just for food!
\
If you can:
\
Patreon: https://www.patreon.com/dataflowjs
\
Paypal: mira28y@gmail.com
\
BTC: 3Kz8ZUCUHHMecoreazudp57ZhuGb1Z99dr
\
ETH (ERC-20): 0xb6bec97a3c764a4e0e92e3c56c6e607c0a3f7e32
\
\
Thanks a lot!

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
    <button @click="@set(&.binding.path, 'Welcome to dataflow.js!')">
      Click
    </button>
    <div :text="*.binding.path, 'default text'"></div>

    <script src="/dataflow.js"></script>
    <script>
      df.exec({ root: "#app" });
    </script>
  </body>
</html>
```

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

#### template

`@` - this is event.
\
`: `- this is directive.

```html
<button @click="@somefunc()"></button>
<div :text="*.some.path'"></div>
```

###### watcher

`*` - places the watcher and passes the value to the function or directive.
\
`#` - does not place a watcher, but passes a value to a function or directive.
\
`&` - does not place a watcher or pass a value, but passes path as an array.
\
`~` - specifies the global path. Used in html template inside `df.component(name, fn)` to point to data outside component (global).
\
\
Possible combinations watcher:

```html
<div :log="*.some.path"></div>
// watcher + value by this path
<div :log="#.some.path"></div>
// only value by this path
<div :log="*~.some.path"></div>
// watcher + value by this path globaly (outside of component)
<div :log="#~.some.path"></div>
// only value by this path globaly (outside of component)
<div :log="&.some.path"></div>
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
`"*.some.path"` - watcher

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
  :log="{something: *.some.path}, 123, ['a', 'b'], {a: [1,2,3], b: true}"
></div>
<div
  :log="@somefunc(123, @somefunc(321, *.somepath)), @somefunc({key: *some.path}, 'string')"
></div>
// etc.
```

#### df.watcher (path, watcher)

This is the watcher that will be fired when there are changes to the data in the specified path.

```javascript
df.watcher("path", function (value) {
  // something
});
```

`value` is the new data that the function will receive at this path.
\
Any path can be watched by any number of watchers.

#### df.set (path, value, ctx)

Creates or modifies data at the specified path and runs `df.flow(path, ctx)` , watchers which in turn modify something on the page or the data itself and pass it on to another path. Another watcher can change the data of other paths and a certain chain of data flow is obtained.

```javascript
df.set("path", "dataflow.js is simple"); // {path: 'dataflow.js is simple'}
df.set("path1.new", true); // {path1: {new: true}}
df.set("table.filter.row.set", [1, 2, 3]); // {table: {filter: {row: {set : [1,2,3]}}}}
//...
```

In the `ctx` object, you can specify the `flow` property see `df.flow(path, ctx)`

#### df.get(path, ctx)

Returns data at the specified path.

```javascript
let val = df.get("path");
```

### df.func(name, fn)

Adds a function that can later be used in the template.
\
If the `fn` parameter is not specified, then returns the function by name.

```javascript
df.func("myFunc", function (val1, val2) {
  // val1 & val2 - is argument of df.parse('true, *.test.test');
  // something
  return val1 === val2;
});
```

```html
<div :text="@myFunc(true, *.test.test)"></div>
// or
<button @focusout="@myFunc(true, false)">Click</button>
```

### df.directive(name, fn)

Adds a directive that can later be used in the template.
\
If the `fn` parameter is not specified, then returns the directive by name.

```javascript
df.func("myDirective", function (val) {
  // val - is argument of df.parse('*.text');
  // something
  this.el.textContent = val;
  //this.el is element which use directive
  //console.log(this) for more info
});
```

```html
<div :myDirective="*.text"></div>
```

#### df.exec(ctx)

Iterates over all elements with `ctx.el.querySelectorAll('*')` parses attributes, registers and immediately executes directives!
\
If `ctx.el` is not present, then searches for the selector from `ctx.root` using `document.querySelector(ctx.root)`
\
By default, `ctx.el` is not parsed, it is used as a container, but if you need to take into account the container itself, you can set the `container` property to `true`.

```html
<div id="someid" :someDirective="some settings">
  <span :text="*.somepath.text, 'loading...'"></span>
  // another elements
</div>
```

```javascript
df.exe({ root: "#someid" }); // {root: 'someid', container: true}
```

You can also skip registering and running directives, for example, if you need to do this not now, but in the future. To do this, you can create a `dataflow` object in the element itself with the `omit` property equal to `true`
\
Since `querySelectorAll('*)` bypasses the elements in order and the directives are immediately executed, we can take any next element from the NodeList, do something with it and set it to `element.dataflow = {omit: true}` and when before this element reaches the queue, it will be skipped.

### df.component(name, fn)

Creates a reusable component.
\
If `fn` is omitted, the method will return `fn` by `name`.
\
Also `name` is used as a prefix for the path within the component, i.e. `name` is used as a unique scope.

```javascript
df.component("user", function () {
  this.root = "#app";
  this.template = `
		<div :text="*.name"></div>
	`;
});
```

From the example above, the watcher path would be `user.name`.
\
To change data outside the component, you need to write the full path `df.set('user.name', 'Artem')`.
\
The `this` context of the component has its own methods `set`, `get`, `watcher`, `func` which also automatically add the `name` prefix of the component to the path.

```javascript
df.component("user", function (stg) {
  // ....
  this.set("name", "Java"); // equal path
  df.set("user.name", "Script"); // equal path

  let x = this.get("name"); // user.name
  this.watch("name", function (val) {
    //user.name
    // ...
  });
  this.func("multiple", function (val, num) {
    return val * num;
    // <div :text="@multiple(*.some.path, 3)"></div>
    // path is user.some.path
  });
});
```

In the example above, path is `user.name`.
\
When inserting a component into a page, it can be passed a `stg` object (settings).

```javascript
df.component("user", function (stg) {
  let color = stg.color || "orange";
  this.root = "#app";
  this.template = `
		<div :text="*.name" style="color: ${color}"></div>
	`;

  console.log(this); // for more details
});

df.inject({
  // comp will create a new component 'user' with path prefix (scope) 'admin'
  comp: "admin",
  root: "#whatever", // will change container
  color: "green",
});
```

Before inserting the component on the page, before `el.innerHTML` there will be a call to df.set('init', true), and after insertion and processing of html, there will be a call to `df.ready('ready', true)`
\
You can create a watcher for this data if needed.

```javascript
df.component("user", function () {
  // ...
  this.watcher("init", function (val) {
    // something
  });
});
df.watch("user.init", function (val) {
  // something
});
```

### df.flow(path, ctx)

Starts watchers.
\
Called and gets `ctx` in the `df.set(path, val, ctx)` method to trigger update of changes.

```javascript
df.watch("somepath", function () {
  // something
  df.set("somepath2", true);
});
df.watch("somepath2", function (val) {
  // something
  console.log(val);
});
df.flow("somepath");
// output
true;
```

The default is to start watchers at the end of path, as this is sufficient in most cases. For example if path is `user.profile.name` it will run watchers that watch the `name` property.
\
In the ctx object, you can specify the `flow` property, it can be 5 values ​​​​and usually it is specified (if necessary) in `df.set(path, val, ctx)`:

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
df.watch("project.name", function (val) {
  //something
  console.log(val);
});
df.flow("project.name", { flow: "none" });
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
\

```javascript
df.watch("project.other.speed", function (val) {
  //something
  console.log(val);
});
df.flow("project.other.speed", { flow: "before" });
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
\

```javascript
df.watch("project.other.info", function (val) {
  //something
  console.log(val);
});
df.flow("project.other.speed", { flow: "after" });
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
df.watch("project.other", function (val) {
  //something
  console.log(val);
});
df.flow("project.other.speed", { flow: "all" });
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
df.watch("project.other.speed.", function (val) {
  //something
  console.log(val);
});
df.flow("project.other.speed", { flow: "all" });
```

#### df.unset(path)

Deletes data at the specified path.

```javascript
df.unset("path");
```

#### df.clean(el, ctx)

Removes all watchers that are attached to the element.
\
If `el` is a string (selector), then `document.querySelector(el)` will run

```javascript
let el = document.querySelector("selector");
df.clean(el);
// or
df.clean("selector");
```

If the `ctx` object has a `data` property equal to `true`, it will also delete all the data watched by the watcher.

```html
<div id="el" :text="*.some.path"></div>

<script>
  df.set("some.path", "some string");
  df.clean("#el", {
    data: true, // data under some.path will be removed
  });
</script>
```

#### df.remove(el, ctx)

Removes the element and all nested elements and calls `df.clean(el, ctx)` for each element

```javascript
let el = document.querySelector("selector");
df.remove(el);
// or
df.remove("selector", { data: true });
```

#### df.parse(str)

> Often this method is not needed and is used very rarely!

Parses a string for later use.

```javascript
	let p = df.parse('123, @func(true), {test: [1,2,3]}, $key');
	console.log(p);
	// output
	{
		obj: [ 123, undefined, [Object], '$key' ],
		watchers: [],
		funcs: [ [Object] ],
		sys: [ [Object] ]
  }
```

#### df.prepare(watcher)

> Often this method is not needed and is used very rarely!

Prepares the data to be passed to the directive.

```javascript
df.func("func", function (val) {
  return !val;
});
df.set("test.test", "asdf");
let s = df.parse("123, *.test.test, @func(true), {test: [1,2,3]}, $key");
let rs = df.prepare({
  ctx: {
    $key: "someKey",
  },
  args: s,
});
console.log(rs);
// output
[123, "asdf", false, { test: [1, 2, 3] }, "someKey"];
```

#### df.register(watcher)

> Often this method is not needed and is used very rarely!

Adds watchers to other watchers.

```javascript
let p = df.parse("*.test.test, *.user.name, #.user.age");
df.register(p); // добавит 2 наблюдателя
```

#### df.transfer(to, from)

> Often this method is not needed and is used very rarely!

Transfers the required data from the component to a new element.
\
When creating a new element inside a component or directive, it needs data to indicate which component it belongs to.

```javascript
df.component("user", function () {
  this.root = "#app";
  this.template = `
		<button @click="@createElement()">New El</button>
	`;
  this.newElementText = "new element text";
  this.func("createElement", function () {
    let newEl = document.createElement("div");
    newEl.setAttribute(":text", "*.newElementText");
    let ctx = {
      el: newEl,
      container: true,
    };
    df.transfer(ctx, this);
    df.exec(ctx);
    this.el.insertAdjacentElement("afterend", newEl); // this.el is button
  });
});
```

### License

Free to use.
