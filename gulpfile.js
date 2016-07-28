var gulp = require('gulp');
var sass = require('gulp-sass');
var concat = require('gulp-concat');

gulp.task('build-css', function() {
    gulp.src(['scss/**/*.scss'])
        .pipe(sass({
            includePaths: [
                './node_modules/bootstrap/scss',
                './node_modules/selectize/dist/less'
            ]
        }).on('error', sass.logError))
        .pipe(concat('app.css'))
        .pipe(gulp.dest('./out'));
});

gulp.task('build-html', function() {
    gulp.src(['snippets/**/*.html'])
        .pipe(processSnippets())
        .pipe(renderTemplates())
        .pipe(gulp.dest("./out"));
});

gulp.task('copy-css', function() {
    return gulp.src([
        'css/*',
        'node_modules/prismjs/themes/prism.css'
    ]).pipe(gulp.dest('./out/css'));
});

gulp.task('copy-js', function() {
    return gulp.src([
        'node_modules/jquery.2/node_modules/jquery/dist/jquery.min.js',
        'node_modules/bootstrap/dist/js/bootstrap.min.js',
        'node_modules/prismjs/prism.js',
        'node_modules/prismjs/plugins/normalize-whitespace/prism-normalize-whitespace.min.js'
    ]).pipe(gulp.dest('./out/js'))
});

gulp.task('watch', function() {
    gulp.start('build');
    gulp.watch('scss/**/*.scss', ['build-css']);
    gulp.watch('snippets/**/*.html', ['build-html']);
    gulp.watch('templates/**/*.hbs', ['build-html']);
    gulp.watch('css/*', ['copy-css']);
});

gulp.task('build', ['build-css', 'build-html', 'copy-css', 'copy-js']);

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

gulp.task('new-snippet', function(cb) {
    if (!('type' in options) || !options['type'] || !options['type'].length) {
        throw new gutil.PluginError('gulp-pattern-library', 'Please specify a --type');
    }

    if (!('name' in options) || !options['name'] || !options['name'].length) {
        throw new gutil.PluginError('gulp-pattern-library', 'Please specify a --name');
    }

    // TODO make sure the combo doesn't exist yet before proceeding

    var scssDir = "scss/" + options['type'],
        htmlDir = "snippets/" + options['type'];

    mkdirp.sync(scssDir);
    mkdirp.sync(htmlDir);

    // New scss file
    fs.writeFileSync(
        scssDir + "/_" + options['name'] + ".scss",
        "/* " + options['name'] + " */"
    );

    // Append scss import
    fs.appendFileSync(
        "scss/style.scss",
        "\n@import \""+options['type']+'/'+options['name']+'";'
    );

    // New snippet html
    //var hbs = handlebars.create({
    //    minimize:    false,
    //    extname:     '.hbs'
    //});
    //
    //hbs.engine('templates/snippet.hbs', { name: options['name'] }, function(err, html) {
    //    if (err) {
    //        throw new gutil.PluginError('gulp-pattern-library', 'Could not render snippet: ' + err);
    //    }
    //
    //    fs.writeFileSync(
    //        htmlDir + "/" + options['name'] + ".html",
    //        html
    //    );
    //
    //    cb();
    //});
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
            snippets[fileParts.dir] = { items: [] };
        }

        htmlToJson.parse(contents, {
            'name':       function($doc) {
                return $doc.find('title').text();
            },
            'description': function($doc) {
                return $doc.find('meta[name="description"]').attr("content");
            },
            'example':     function($doc) {
                return $doc.find('body').html().trim();
            }
        }).done(function(result) {
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

function renderTemplates() {

    return through.obj(function(snippets, enc, cb) {
        gutil.log("Rendering...");

        var partialDir = 'templates/partials/';

        handlebars.registerPartial("_content", fs.readFileSync(partialDir + '_content.hbs').toString());
        handlebars.registerPartial("_item", fs.readFileSync(partialDir + '_item.hbs').toString());
        handlebars.registerPartial("_toc", fs.readFileSync(partialDir + '_toc.hbs').toString());

        var tmpl = handlebars.compile(fs.readFileSync('templates/index.hbs').toString(), { preventIndent: true });

        this.push(new File({
            path: "index.html",
            contents: new Buffer(tmpl(snippets))
        }));

        cb();
    });

}
