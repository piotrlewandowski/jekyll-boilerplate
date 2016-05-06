var gulp          = require('gulp');
var gnotify       = require('gulp-notify');
var browserSync   = require('browser-sync');
var del           = require('del');
var concat        = require('gulp-concat');
var gulpif        = require('gulp-if');
var sass          = require('gulp-sass');
var scsslint      = require('gulp-scss-lint');
var cleanCSS      = require('gulp-clean-css');
var minifyJs      = require('gulp-uglify');
var autoprefixer  = require('gulp-autoprefixer');
var sourcemaps    = require('gulp-sourcemaps');
var imageMin      = require('gulp-imagemin');
var runSequence   = require('run-sequence');
var cp            = require('child_process');
var path          = require('path');

var prod = false;
var jekyll = process.platform === 'win32' ? 'jekyll.bat' : 'jekyll';

// Keep source directory in sync with _config.yml
var PATHS = {
  source: path.join(__dirname, 'source'),
  public: path.join(__dirname, 'public')
};

gulp.task('clean', function(done) {
  return del(path.join(PATHS.public, '**/*'));
});

gulp.task('jekyll-build', function(done) {
  cp.spawn(jekyll, ['build', !prod ? '--drafts' : null], { stdio: 'inherit' })
    .on('close', function(code) {
      done(code === 0 ? null : 'ERROR: Jekyll process exited with code: ' + code);
    });
});

gulp.task('jekyll-rebuild', ['jekyll-build'], function() {
  browserSync.reload();
});

gulp.task('browser-sync', ['build'], function() {
  browserSync({
    notify: false,
    open: false,
    server: {
      baseDir: 'public'
    }
  });
});

gulp.task('js', function() {
  return gulp.src([
      // Add your JS dependencies here to include them in the bundle.
      'node_modules/fastclick/lib/fastclick.js',
      path.join(PATHS.source, 'js/vendor/*.js'),
      path.join(PATHS.source, 'js/helpers.js'),
      path.join(PATHS.source, 'js/main.js'),
      path.join(PATHS.source, 'js/components/*.js')
    ])
    .pipe(gulpif(!prod, sourcemaps.init()))
    .pipe(concat('main.js'))
    .pipe(gulpif(!prod, sourcemaps.write()))
    .pipe(gulpif(prod, minifyJs()))
    .pipe(gulp.dest(path.join(PATHS.public, 'js')))
    .pipe(gulpif(!prod, browserSync.reload({ stream: true })));
});

gulp.task('images', function() {
  return gulp.src(path.join(PATHS.source, 'images/**/*'))
    .pipe(gulpif(prod, imageMin({
      progressive: true,
      interlaced: true,
      multipass: true
    })))
    .pipe(gulp.dest(path.join(PATHS.public, 'images')))
    .pipe(gulpif(!prod, browserSync.reload({ stream: true })));
});

gulp.task('fonts', function() {
  return gulp.src([
      path.join(PATHS.source, 'fonts/**/*')
    ])
    .pipe(gulp.dest(path.join(PATHS.public, 'fonts')))
    .pipe(gulpif(!prod, browserSync.reload({ stream: true })));
});

gulp.task('sass', function() {
  return gulp.src(path.join(PATHS.source, 'sass/**/*.scss'))
    .pipe(gulpif(!prod, sourcemaps.init()))
    .pipe(scsslint({
      'config': '.scss-lint.yml'
    }))
    .pipe(sass({
      outputStyle: 'expanded',
      includePATHS: [
        'scss'
      ]
    })
      .on('error', sass.logError))
    .on('error', gnotify.onError({
      title: 'Sass Error',
      message: 'Error in file <%= error.message %>'
    }))
    .pipe(autoprefixer({
      browsers: ['> 5%', 'IE >= 9']
    }))
    .pipe(gulpif(!prod, sourcemaps.write()))
    .pipe(gulpif(prod, cleanCSS({
      // CSS animations on IE/Edge seem to need units on zero.
      compatibility: '-properties.zeroUnits'
    })))
    .pipe(gulp.dest(path.join(PATHS.public, 'css')))
    .pipe(gulpif(!prod, browserSync.reload({ stream: true })));
});

gulp.task('watch', function() {
  gulp.watch(path.join(PATHS.source, 'images/**/*'), ['images']);
  gulp.watch(path.join(PATHS.source, 'sass/**/*.scss'), ['sass']);
  gulp.watch(path.join(PATHS.source, 'js/**/*.js'), ['js']);
  gulp.watch([
    path.join(PATHS.source, '**/*.html'),
    path.join(PATHS.source, '**/*.yml'),
    path.join('!', PATHS.public, '**/*')
  ], ['jekyll-rebuild']);
});

gulp.task('build', function(done) {
  runSequence('fonts', ['js', 'images', 'sass', 'jekyll-build'], done);
});

gulp.task('default', ['browser-sync', 'watch']);

gulp.task('prod', function(done) {
  prod = true;
  runSequence('clean', ['build'], done);
});
