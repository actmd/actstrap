var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');

/**
 * Builds actstrap-common.css
 */
gulp.task('build-common-css', function () {
    gulp.src(['scss/common/**/*.scss'])
        .pipe(sass({
            includePaths: [
                './node_modules/bootstrap/scss',
                './node_modules/selectize/dist/less'
            ]
        }).on('error', sass.logError))
        .pipe(concat('actstrap-common.css'))
        .pipe(gulp.dest('./out'));
});

/**
 * Builds actstrap-desktop.css
 */
gulp.task('build-desktop-css', function () {
    gulp.src(['scss/desktop/**/*.scss'])
        .pipe(sass({
            includePaths: [
                './node_modules/bootstrap/scss'
            ]
        }).on('error', sass.logError))
        .pipe(concat('actstrap-desktop.css'))
        .pipe(gulp.dest('./out'));
});

/**
 * Builds actstrap-mobile.css
 */
gulp.task('build-mobile-css', function () {
    gulp.src(['scss/mobile/**/*.scss'])
        .pipe(sass({
            includePaths: [
                './node_modules/bootstrap/scss'
            ]
        }).on('error', sass.logError))
        .pipe(concat('actstrap-mobile.css'))
        .pipe(gulp.dest('./out'));
});

/**
 * Builds all the actstrap CSS bundles
 */
gulp.task('build-css', ['build-common-css', 'build-desktop-css', 'build-mobile-css']);


gulp.task('build-common-html', function () {
    gulp.src(['snippets/common/**/*.html'])
        .pipe(processSnippets())
        .pipe(renderTemplates('Common', 'index.html'))
        .pipe(gulp.dest("./out"));
});

gulp.task('build-desktop-html', function () {
    gulp.src(['snippets/desktop/**/*.html'])
        .pipe(processSnippets())
        .pipe(renderTemplates('Desktop', 'desktop.html'))
        .pipe(gulp.dest("./out"));
});

gulp.task('build-mobile-html', function () {
    // Mobile snippets are embedded individuall within iframes
    // to simulate viewing on a mobile device
    gulp.src(['snippets/mobile/**'])
        .pipe(normalizeMobileSnippets())
        .pipe(gulp.dest('./out'));

    gulp.src(['snippets/mobile/**/*.html'])
        .pipe(processSnippets())
        .pipe(renderTemplates('Mobile', 'mobile.html'))
        .pipe(gulp.dest("./out"));
});

/**
 * Builds all the pattern library HTML pages
 */
gulp.task('build-html', ['build-common-html', 'build-desktop-html', 'build-mobile-html']);


/**
 * Copy the CSS needed to render the pattern library web site.
 */
gulp.task('copy-patterns-css', function () {
    return gulp.src([
        'css/*',
        'node_modules/prismjs/themes/prism.css'
    ]).pipe(gulp.dest('./out/css'));
});

/**
 * Copy the JS needed to render the pattern library web site.
 */
gulp.task('copy-patterns-js', function () {
    return gulp.src([
        'node_modules/jquery.2/node_modules/jquery/dist/jquery.min.js',
        'node_modules/bootstrap/dist/js/bootstrap.min.js',
        'node_modules/prismjs/prism.js',
        'node_modules/prismjs/plugins/normalize-whitespace/prism-normalize-whitespace.min.js',
        'node_modules/tether/dist/js/tether.min.js'
    ]).pipe(gulp.dest('./out/js'))
});

gulp.task('watch', function () {
    gulp.start('build');
    gulp.watch('scss/**/*.scss', ['build-css']);
    gulp.watch('snippets/**/*.html', ['build-html']);
    gulp.watch('templates/**/*.hbs', ['build-html']);
    gulp.watch('css/*', ['copy-patterns-css']);
});

gulp.task('build', ['build-css', 'build-html', 'copy-patterns-css', 'copy-patterns-js']);

gulp.task('default', ['build']);


/*
 ** Pattern library generation 'plugin'
 */

var gutil = require('gulp-util');
var handlebars = require('handlebars');
var through = require('through2');
var path = require('path');
var htmlToJson = require('html-to-json');
var fs = require('fs');
var mkdirp = require('mkdirp');
var File = gutil.File;

var options = require('minimist')(process.argv.slice(2));

gulp.task('new-snippet', function (cb) {
    if (!('kind' in options) || !options['kind'] || !options['kind'].length) {
        throw new gutil.PluginError('gulp-pattern-library', 'Please specify a --kind [common, desktop, mobile]');
    }

    if (!('type' in options) || !options['type'] || !options['type'].length) {
        throw new gutil.PluginError('gulp-pattern-library', 'Please specify a --type [atoms, molecules, organisms]');
    }

    if (!('name' in options) || !options['name'] || !options['name'].length) {
        throw new gutil.PluginError('gulp-pattern-library', 'Please specify a --name');
    }

    // TODO make sure the combo doesn't exist yet before proceeding
    // TODO make sure that kind & type are one of the known options

    var scssDir = "scss/" + options['kind'] + '/' + options['type'],
        htmlDir = "snippets/" + options['kind'] + '/' + options['type'];

    mkdirp.sync(scssDir);
    mkdirp.sync(htmlDir);

    // New scss file
    fs.writeFileSync(
        scssDir + "/_" + options['name'] + ".scss",
        "/* " + options['kind'] + ': ' + options['name'] + " */"
    );

    // Append scss import
    fs.appendFileSync(
        "scss/" + options['kind'] + "/actstrap-" + options['kind'] +".scss",
        "\n@import \"" + options['type'] + '/' + options['name'] + '";'
    );

    // New snippet html
    var tmpl = handlebars.compile(fs.readFileSync('templates/snippet.hbs').toString());

    fs.writeFileSync(htmlDir + "/" + options['name'] + ".html", tmpl({name: options['name'], isMobile: options['kind'] == 'mobile'}));

    cb();
});

function processSnippets() {

    var snippets = {},
        snippetCount = 0;

    function bufferContents(file, enc, cb) {

        // ignore empty files
        if (file.isNull()) {
            cb();
            return;
        }

        // we don't do streams
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-pattern-library', 'Streaming not supported'));
            cb();
            return;
        }

        var fileParts = path.parse(file.relative),
            contents = file.contents.toString();

        gutil.log("Processing", gutil.colors.cyan(fileParts.name), "snippet in collection", gutil.colors.cyan(fileParts.dir));

        if (!(fileParts.dir in snippets)) {
            snippets[fileParts.dir] = {items: []};
        }

        htmlToJson.parse(contents, {
            'path': file.relative,
            'name': function ($doc) {
                return $doc.find('title').text();
            },
            'description': function ($doc) {
                return $doc.find('meta[name="description"]').attr("content");
            },
            'example': function ($doc) {
                return $doc.find('body').html().trim();
            }
        }).done(function (result) {
            result.slug = fileParts.dir + "_" + fileParts.name;
            snippets[fileParts.dir].items.push(result);
            snippetCount++;
            cb();
        });
    }

    function endStream(cb) {
        gutil.log("Processed", gutil.colors.magenta(snippetCount), "snippets in", gutil.colors.magenta(Object.keys(snippets).length), "collections");
        this.push(snippets);
        cb();
    }

    return through.obj(bufferContents, endStream);
}

/**
 * Need to transform CSS/JS paths in the snippets to work on the server
 * @returns {*}
 */
function normalizeMobileSnippets() {

    var find = /\.\.\/\.\.\/out\//g,
        replace = '../';

    return through.obj(function(file, enc, cb) {

        // ignore empty files
        if (file.isNull()) {
            cb();
            return;
        }

        // we don't do streams
        if (file.isStream()) {
            this.emit('error', new gutil.PluginError('gulp-pattern-library', 'Streaming not supported'));
            cb();
            return;
        }

        var updatedContents = file.contents.toString().replace(find, replace);
        file.contents = new Buffer(updatedContents);

        this.push(file);
        cb();
    });
}

function renderTemplates(variant, path) {

    return through.obj(function (snippets, enc, cb) {
        gutil.log("Rendering...");

        var partialDir = 'templates/partials/',
            isMobile = (variant == 'Mobile');

        handlebars.registerPartial("_content", fs.readFileSync(partialDir + '_content.hbs').toString());
        handlebars.registerPartial("_toc", fs.readFileSync(partialDir + '_toc.hbs').toString());

        if (isMobile) {
            handlebars.registerPartial("_item", fs.readFileSync(partialDir + '_item_mobile.hbs').toString());
        } else {
            handlebars.registerPartial("_item", fs.readFileSync(partialDir + '_item.hbs').toString());
        }

        var tmpl = handlebars.compile(fs.readFileSync('templates/index.hbs').toString(), {preventIndent: true});

        this.push(new File({
            path: path,
            contents: new Buffer(tmpl({
                isMobile: isMobile,
                variant: variant,
                snippets: snippets
            }))
        }));

        cb();
    });

}
