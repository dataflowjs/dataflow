# dataflow

Идея состоит в том, чтобы создать простой, быстрый и мощный JS фреймворк с быстрым началом разработки.
Присоединяйтесь!

# Вступление

Здравствуйте, я из Украины, город Херсон. Моя страна сейчас находится под атакой!
Сейчас очень сложно, многие люди просят просто еду!
Если вы можете:
Patreon: https://www.patreon.com/dataflowjs
Paypal: mira28y@gmail.com
BTC: 3Kz8ZUCUHHMecoreazudp57ZhuGb1Z99dr
ETH (ERC-20): 0xb6bec97a3c764a4e0e92e3c56c6e607c0a3f7e32

Большое спасибо!

# Поддержка

### Фукциональность

- Привязка данных
- Переиспользование компонентов
- Директивы
- Функции

### Простой пример

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

# Документация

### path

Это путь в объекте разделенный точкой, например path `"user.profile.name"` в объкте будет

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

`@` - это событие.
`: `- это директива.

```html
<button @click="@somefunc()"></button>
<div :text="*.some.path'"></div>
```

###### watcher

`*` - размещает watcher и передает значение в функцию или директиву.
`#` - не размещает watcher, а просто передает значенр в функцию или директиву.
`&` - не размещает watcher и не передает значение, а передает просто path в виде массива.
`~` - указывает глобальный path. Используется в html шаблоне внутри `df.component(name, fn)`, что бы указать на данные вне component (глобальные).

Возвможные комбинации watcher:

```html
<div :log="*.some.path"></div>
// watcher + значение по path
<div :log="#.some.path"></div>
// только значение по path
<div :log="*~.some.path"></div>
// watcher + значение по path глобально (из нутри компонента указывает на вне
компонента)
<div :log="#~.some.path"></div>
// только значение по path глобально (из нутри компонента указывает на вне
компонента)
<div :log="&.some.path"></div>
// path как массив ['some', 'path']
```

В шаблоне можно можно указывать (на данный момент):
`"123"` - число
`"1.3"` - число
`"'string'"` - строка
`"true"` - булевое значение
`"[1,'2',true]"` - массив
`"{key: value}"` - объект
`"@somefunc()"` - функция
`"*.some.path"` - watcher

```html
<div :log="123"></div>
<div :log="'string'"></div>
<div :log="{something: true}">
  <div :log="@somefunc([1,2,3])"></div>
</div>
```

> watcher НЕ может быть ключем объекта!

Также можно комбинировать аргументы через запятую:

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

Это наблюдатель который будет запущен когда произойдут изменения данных по указанному path.

```javascript
df.watcher("path", function (value) {
  // something
});
```

`value` - это новые данные которые получит функция по этому path.
За любым path может наблюдать сколько угодно watcher.

#### df.set (path, value, ctx)

Создает или изменяет данные по указанному path и запускает `df.flow(path, ctx)`, а именно watchers которые в свою очередь изменяют, что-то на странице или сами данные и передают их дальше в другой path. Другой watcher может изменять данные других path и получается некая цепь потока данных.

```javascript
df.set("path", "dataflow.js is simple"); // {path: 'dataflow.js is simple'}
df.set("path1.new", true); // {path1: {new: true}}
df.set("table.filter.row.set", [1, 2, 3]); // {table: {filter: {row: {set : [1,2,3]}}}}
//...
```

В объекте `ctx` можно указать свойство `flow` смотрите `df.flow(path, ctx)`

#### df.get(path, ctx)

Возвращает данные по указаному path.

```javascript
let val = df.get("path");
```

### df.func(name, fn)

Добавляет функцию которую в дальнейшем можно использовать в шаблоне.
Если параметр `fn` не указан, то возвращает функцию по названию.

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

Добавляет директиву которую в дальнейшем можно использовать в шаблоне.
Если параметр `fn` не указан, то возвращает директиву по названию.

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

Обходит все элементы с помощью `ctx.el.querySelectorAll('*')` парсит атрибуты, регистрирует и сразу выплняет директивы!
Если `ctx.el` нету, то ищет по селектору из `ctx.root` с помощью `document.querySelector(ctx.root)`
По умалчанию `ctx.el` не парсится, он используется как контейнер, но если нужно учитывать и сам контейнер, то можно установить свойство `container` равным `true`.

```html
<div id="someid" :someDirective="some settings">
  <span :text="*.somepath.text, 'loading...'"></span>
  // another elements
</div>
```

```javascript
df.exe({ root: "#someid" }); // {root: 'someid', container: true}
```

Также можно пропустить регистрацию и запуск директив, например если это нужно будет сделать не сейчас, а в дальнейшев. Для этого можно в самом элементе в создать объект `dataflow` со свойством `omit` равным `true`
Так как `querySelectorAll('*)` обходи элементы по порядку и сразу выполняются директивы, то мы можем взять любой следующий элемент из NodeList сделать с ним что-то и установить ему `element.dataflow = {omit: true}` и когда до этого элемента дойдет очередь, то он будет пропущен.

### df.component(name, fn)

Создает повторно используемый компонент.
Если `fn` упустить, то метод вернет `fn` по `name`.
Также `name` используется как префикс для path внутри компонента, то есть `name` используется как уникальная область для хранения (scope).

```javascript
df.component("user", function () {
  this.root = "#app";
  this.template = `
		<div :text="*.name"></div>
	`;
});
```

Из примера выше watcher path будет таким `user.name`.
Для изменения данных вне компонента нужно писать полный path `df.set('user.name', 'Artem')`.
У контекста `this` компонента, есть свои методы `set`, `get`, `watcher`, `func` у которых в path также автоматически добавляется префикс `name` компонента.

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

В примере выше path равен `user.name`.

При вставке компонент на страницу, ему можно передать объект `stg` (settings).

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

Перед вставкой компонента на страницу перед `el.innerHTML` будет вызов df.set('init', true), а после вставки и обработки html будет вызов df.ready('ready', true);
Вы можете создать watcher на эти данные если нужно.

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

Запускает watchers.
Вызывается и получает `ctx`в методе `df.set(path, val, ctx)` для запуска обновления изменений.

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

По умолчанию запускает watchers по окончанию path, так как в большинстве случаев этого достаточно. Например если path `user.profile.name` то запустит watchers которые смотрят за свойством `name`.
В объекте ctx можно указать свойство `flow`, оно может быть 5-и значений и обычно оно указываются (если нужно) в `df.set(path, val, ctx)`:

- 'none'
- 'before'
- 'after'
- 'all'
- 'deep'

Например есть такие данные:

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

Если `{flow: 'none'}`:
То watchers запущены не будут.

```javascript
df.watch("project.name", function (val) {
  //something
  console.log(val);
});
df.flow("project.name", { flow: "none" });
```

Если `{flow: 'before'}`:
То запустятся watchers все по текущему path.
Из примера ниже запустит watchers по таким path:
'project'
'project.other'
'project.other.speed'

```javascript
df.watch("project.other.speed", function (val) {
  //something
  console.log(val);
});
df.flow("project.other.speed", { flow: "before" });
```

Если `{flow: 'after'}`:
То запустятся watchers текущий и по всем справа от текущего path.
Из примера ниже запустит watchers по таким path:
'project.other.info'
'project.other.info.from'

```javascript
df.watch("project.other.info", function (val) {
  //something
  console.log(val);
});
df.flow("project.other.speed", { flow: "after" });
```

Если `{flow: 'all'}`:
То запустятся watchers слева по path и по всем справа возможным path.
Из примера ниже запустит watchers по таким path:
'project'
'project.other'
'project.other.info'
'project.other.info.from'
'project.other.speed'

```javascript
df.watch("project.other", function (val) {
  //something
  console.log(val);
});
df.flow("project.other.speed", { flow: "all" });
```

Если `{flow: 'deep'}`:
То запустятся watchers по всем возможным направлениям.
Из примера ниже запустит watchers по таким path:
'project'
'project.name'
'project.other'
'project.other.info'
'project.other.info.from'
'project.other.speed'

```javascript
df.watch("project.other.speed.", function (val) {
  //something
  console.log(val);
});
df.flow("project.other.speed", { flow: "all" });
```

#### df.unset(path)

Удаляет данные по указанному path.

```javascript
df.unset("path");
```

#### df.clean(el, ctx)

Удаляет все watcher которые привязаны к элементу.
Если `el` строка (селектор), то запустится `document.querySelector(el)`

```javascript
let el = document.querySelector("selector");
df.clean(el);
// or
df.clean("selector");
```

Если объектe `ctx` есть свойство `data` равный `true`, то удалит еще и все данные за которыми смотрят watcher.

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

Удаляет элемент и все вложенные элементы и для каждого элемента вызывает `df.clean(el, ctx)`

```javascript
let el = document.querySelector("selector");
df.remove(el);
// or
df.remove("selector", { data: true });
```

#### df.parse(str)

> Зачастую этот метод не нужен и используется очень редко!

Парсит строку для дальнейшего использования.

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

> Зачастую этот метод не нужен и используется очень редко!

Подготавливает данные которые будут переданы в directive.

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

> Зачастую этот метод не нужен и используется очень редко!

Добавляет watchers к другим налюдателям.

```javascript
let p = df.parse("*.test.test, *.user.name, #.user.age");
df.register(p); // добавит 2 наблюдателя
```

#### df.transfer(to, from)

> Зачастую этот метод не нужен и используется очень редко!

Переносит необходимые данные из компонента в новый элемент.
При создании нового элемента внутри компонента или директивы ему нужны данные которые будут обозначать к какому компоненту он принадлежит.

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
