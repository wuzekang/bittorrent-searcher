var gulp = require("gulp");
var ts = require("gulp-typescript");
var sourcemaps = require('gulp-sourcemaps');
var project = ts.createProject("tsconfig.json");

gulp.task("default", function () {
    return project.src()
        .pipe(sourcemaps.init())    
        .pipe(project()).js
        .pipe(sourcemaps.write())
        .pipe(gulp.dest("dist"));
});

gulp.task("watch", ['default'], function() {
    gulp.watch('src/**/*.ts', ['default'])
});