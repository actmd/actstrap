# actstrap

ACT.md's web pattern library, building on [Bootstrap 4](http://v4-alpha.getbootstrap.com/) and inspired by Brad Frost's [Atomic Design](http://atomicdesign.bradfrost.com/chapter-2/)

## quickstart

### Install gulp and npm dependencies

```
$ npm install --global gulp-cli
$ npm install
```

### Generate the library and view it

```
$ gulp
$ open out/index.html
```

### Regenerate the library whenever a stylesheet, snippet, or template changes

```
$ gulp watch
```

### Add a pattern to the library

```
$ gulp new-snippet --type=molecules --name=fooBarBaz
```

* Creates empty `scss/molecules/_fooBarBaz.scss`
* Adds import for above to `style.scss`
* Creates `snippets/molecules/fooBarBaz.html` with starter code (containing instructions)

Options for `--type` include:

* `atoms`
* `molecules`
* `organisms`
* `templates`
