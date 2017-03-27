# actstrap

ACT.md's web pattern library, building on [Bootstrap 4](http://v4-alpha.getbootstrap.com/) and 
inspired by Brad Frost's [Atomic Design](http://atomicdesign.bradfrost.com/chapter-2/)

Our pattern library is organized by target device, and compiled into three outputs:

* `actstrap-common.css`, used by all devices
* `actstrap-desktop.css`, used by desktop (i.e. large-screened) devices
* `actstrap-mobile.css`, used by mobile (i.e. smartphone and tablet) devices


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

### Generate and copy the new CSS to act-heka

```
$ gulp
$ cp out/actstrap.css ../act-heka/vendor/assets/stylesheets/
```

### Regenerate the library whenever a stylesheet, snippet, or template changes

```
$ gulp watch
```

### Add a pattern to the library

```
$ gulp new-snippet --kind=common --type=molecules --name=fooBarBaz
```

* Creates empty `scss/common/molecules/_fooBarBaz.scss`
* Adds import for above to `scss/common/style.scss`
* Creates `snippets/common/molecules/fooBarBaz.html` with starter code (containing instructions)

Options for `--kind`:

* `common`
* `desktop`
* `mobile`

Options for `--type`:

* `atoms`
* `molecules`
* `organisms`
