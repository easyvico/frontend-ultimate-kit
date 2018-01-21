var gulp = require('gulp');
var imagemin = require('gulp-imagemin');
var sass = require('gulp-sass');
var compass = require('compass-importer');
var pug = require('gulp-pug');
var sourcemaps = require('gulp-sourcemaps');
var concat = require('gulp-concat');
var path = require('path');
var del = require('del');
var cache = require('gulp-cached');
var replace = require('gulp-replace');
var browserSync = require('browser-sync').create();
var runSequence = require('run-sequence');
var sassLint = require('gulp-sass-lint');
var bootlint  = require('gulp-bootlint');
var uglify = require('gulp-uglify');
var mjml = require('gulp-mjml');

require('events').EventEmitter.prototype._maxListeners = 100;

var basedir = {
  framework: './node_modules/maif-framework-presentation',
  localFramework: './presentation/framework',
  maquette: './presentation/maquette',
  srcPrj: '../../{#ProjectName}/src/main/webapp'
};

gulp.task('default', [ 'build' ]);

gulp.task('images', function() {
  return gulp.src([ basedir.framework + '/img/**/*.*',
      basedir.localFramework + '/img/**/*.*',
      basedir.maquette + '/img/**/*.*'])
    .pipe(cache('images'))
    .pipe(imagemin())
    .pipe(gulp.dest(basedir.maquette + '/dist/img/rwd'));
});

gulp.task('templates', function() {
  return gulp.src([ basedir.maquette + '/jade/*.jade',
      basedir.maquette + '/jade/pages/**/*.jade' ])
    .pipe(cache('templates'))
    .pipe(pug({
      pretty : true
    }))
    .pipe(gulp.dest(basedir.maquette + '/dist'))
    .pipe(bootlint({
      disabledIds: ['W009'],
    }));
});

gulp.task('css', function() {
  return gulp.src([ basedir.localFramework + '/sass/*.scss' ])
    .pipe(sourcemaps.init())
    .pipe(sass({
      includePaths: [
        path.resolve(__dirname, 'node_modules') // npm
      ],
      importer: compass,
      outputStyle: 'compressed'
    }).on('error', sass.logError))
    .pipe(sourcemaps.write('./maps'))
    .pipe(gulp.dest(basedir.maquette + '/dist/css/rwd'))
    .pipe(browserSync.stream());
});

gulp.task('fonts', function() {
  return gulp.src([ basedir.framework + '/fonts/**/*.*', basedir.localFramework + '/fonts/**/*.*' ]).pipe(gulp.dest(basedir.maquette + '/dist/font/rwd'));
});

gulp.task('js-fwk', function(){
  return gulp.src(
      [ 'node_modules/jquery/dist/jquery.js',
        'node_modules/bootstrap-sass/assets/javascripts/bootstrap.js',
        basedir.framework + '/js/*.*',
        basedir.localFramework + '/js/*.*' ])
    .pipe(cache('js'))
    .pipe(concat('all.js'))
    .pipe(gulp.dest(basedir.maquette + '/dist/js/rwd'))
    .pipe(browserSync.stream());
});

gulp.task('js-temp', function() {
  return gulp.src([ basedir.localFramework + '/js/0tp/**/*.*' ]).pipe(gulp.dest(basedir.maquette + '/dist/js/rwd/0tp')).pipe(browserSync.stream());
});

gulp.task('js-custom', function(){
  return gulp.src([ basedir.localFramework + '/js/custom/*.js' ]).pipe(concat('custom.js')).pipe(gulp.dest(basedir.maquette + '/dist/js/rwd/maquette')).pipe(browserSync.stream());
});

gulp.task('js-fonctionnel', function(){
  return gulp.src([ basedir.localFramework + '/js/fonctionnel/**/*.js' ]).pipe(gulp.dest(basedir.maquette + '/dist/js/rwd/fonc')).pipe(browserSync.stream());
});

gulp.task('js-custom-json', function(){
  return gulp.src([ basedir.localFramework + '/js/custom/*.json' ]).pipe(gulp.dest(basedir.maquette + '/dist/js/rwd/maquette')).pipe(browserSync.stream());
});

gulp.task('js', function(cb) {
  runSequence([ 'js-fwk', 'js-temp', 'js-custom', 'js-fonctionnel', 'js-custom-json' ], cb);
});

gulp.task('js-uglify', function(){
  return gulp.src(
      [ basedir.maquette + '/dist/js/rwd/footer.js' ])
    .pipe(uglify())
    .pipe(gulp.dest(basedir.maquette + '/dist/js/rwd'))    
    .pipe(browserSync.stream());
});

gulp.task('build', function(cb) {
  runSequence([ 'templates', 'fonts', 'css', 'js', 'mails' ], cb);
});

gulp.task('build-complete', function(cb) {
  runSequence('clean', [ 'templates', 'images', 'fonts', 'css', 'js' ],'js-uglify', cb);
});

gulp.task('clean', function() {
  return del.sync([ basedir.maquette + '/dist/**/*' ]);
});

gulp.task('server', function() {
  browserSync.init({
    server: {
      baseDir: basedir.maquette + '/dist'
    },
    port:8000,
    reloadDelay: 150,
    open:false
  });
});

gulp.task('copyToProject', function() {
  runSequence('build-complete', function(){
    gulp.src(basedir.maquette + '/dist/font/rwd/**/*').pipe(gulp.dest(basedir.srcPrj + '/content/fonts'));
    gulp.src(basedir.maquette + '/dist/css/rwd/**/*')
      .pipe(replace('../../font/rwd/', '../fonts/'))
      .pipe(replace('../../img/rwd/', '../images/'))
      .pipe(gulp.dest(basedir.srcPrj + '/content/css'));
    gulp.src(basedir.maquette + '/dist/img/rwd/**/*').pipe(gulp.dest(basedir.srcPrj + '/content/images'));
  });
});

gulp.task('checkSass', function () {
    return gulp.src( basedir.framework + '/sass/**/*.scss')
    .pipe(sassLint({
      options: {
        formatter: 'stylish',
        'merge-default-rules': false
      },
      rules: {
        'no-ids': 1,
        'no-mergeable-selectors': 0
      },
      configFile: 'config/other/.sass-lint.yml'
    }))
    .pipe(sassLint.format())
    .pipe(sassLint.failOnError())
});

/* Tâche mjml */
gulp.task('mails', function () {
 return gulp.src(basedir.maquette + '/mails/**/*.jade').pipe(pug({
      pretty : true
    }))
   .pipe(mjml())
   .pipe(gulp.dest(basedir.maquette + '/dist/mails'))
})

gulp.task('watch', [ 'default', 'server' ], function() {
  gulp.watch([ basedir.framework + '/sass/**/*.scss', basedir.localFramework + '/sass/**/*.scss'], { ignoreInitial: false }, ['css']);
  gulp.watch([ basedir.maquette + '/jade/**/*.jade'], { ignoreInitial: false }, [ 'templates' ]).on('change', browserSync.reload);
  gulp.watch([ basedir.framework + '/js/**/*.*', basedir.localFramework + '/js/**/*.*' ], { ignoreInitial: false }, [ 'js' ]);
  gulp.watch([ basedir.framework + '/fonts/**/*.*', basedir.localFramework + '/fonts/**/*.*' ], { ignoreInitial: false }, [ 'fonts' ]).on('change', browserSync.reload);
  gulp.watch([ basedir.framework + '/img/**/*.*', basedir.localFramework + '/img/**/*.*', basedir.maquette + '/img/**/*.*'], { ignoreInitial: false }, [ 'images' ]).on('change', browserSync.reload);
  gulp.watch([ basedir.maquette + '/mails/**/*.jade'], { ignoreInitial: false }, [ 'mails' ]).on('change', browserSync.reload);
});