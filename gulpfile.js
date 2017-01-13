var gulp = require("gulp");
var ts = require("gulp-typescript");
var sourcemaps = require('gulp-sourcemaps');
var pug = require('gulp-pug');
var sass = require('gulp-sass');

gulp.task("default", ['server', 'browser', 'styles', 'views']);

gulp.task("server", function () {
    return gulp.src(['src/**/*.ts', '!src/assets/**/*.ts'])
        .pipe(ts({
            lib:[
                'es2015'
            ],
            target: 'es5',
            sourceMap: true
        }))
        .pipe(gulp.dest("dist"));
});

gulp.task("browser", function() {
    return gulp.src('src/assets/scripts.ts')
        //.pipe(sourcemaps.init())    
        .pipe(ts({
            lib:[
                'es2015'
            ],
            target: 'es5',
            sourceMap: true,
            module: 'amd',
            allowJs: true,
            outFile: 'scripts.js'
        }))
        //.pipe(sourcemaps.write())
        .pipe(gulp.dest('dist/public/assets'));
})

gulp .task("styles", function() {
    return gulp.src('src/assets/styles.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest('dist/public/assets'));
})

gulp.task("views", function() {
    return gulp.src('src/views/**/*.pug')
        .pipe(gulp.dest("dist/views"));
})

gulp.task("watch", ['server', 'browser', 'views', 'styles'], function() {
    gulp.watch('src/**/*.ts', ['server'])
    gulp.watch('src/views/**/*.pug', ['views'])
    gulp.watch('src/assets/**/*.scss', ['styles'])
    gulp.watch('src/assets/**/*.ts', ['browser'])
});