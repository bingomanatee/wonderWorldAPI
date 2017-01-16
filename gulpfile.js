      const gulp = require('gulp');
      const zip = require('gulp-zip');
      const fs = require('fs');
      var del = require('del');

      const EB_CONFIG = './eb.config.json';

      gulp.task('clear', function(cb) {
        return del(['dist', 'eb'], cb);
      });

      gulp.task('prep', function() {
        return gulp.src(['./**/*', '!./node_modules/', '!./node_modules/**/*']) // Gets all files ending with .scss in app/scss and children dirs
          .pipe(gulp.dest('dist'))
      });

      gulp.task('zip', () => {
        const config = require(EB_CONFIG);
        let version = config.version.split('.').map((n) => parseInt(n));
        ++version[2];
        config.version = version.join('.');
        fs.writeFileSync(EB_CONFIG, JSON.stringify(config));

        return gulp.src('dist/*')
          .pipe(zip(config.archive_name + '.v' + config.version + '.zip'))
          .pipe(gulp.dest('eb'));
      });

      gulp.task('eb', ['clear', 'prep', 'zip'], function () {

      });