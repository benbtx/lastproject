'use strict';
// npm插件
const gulp = require('gulp'),
    ts = require('gulp-typescript'),
    tsProject = ts.createProject('tsconfig.json'),
    replace = require('gulp-batch-replace'),
    htmlMin = require('gulp-htmlmin'),
    sass = require('gulp-sass'),
    clean = require('gulp-clean'),
    browserSync = require('browser-sync').create(),
    autoPrefixer = require('gulp-autoprefixer'),
    cleanCSS = require('gulp-clean-css'),
    imageMin = require('gulp-imagemin'),
    ifElse = require('gulp-if-else'),
    runSequence = require('run-sequence');

// 定义统一常量
var config = {
    product: false,
    src: "src",
    dist: "dist",
    serverRoot: "./dist"
}

// 处理 TypeScript 文件
gulp.task('typescript', function () {
    tsProject.src()
        .pipe(tsProject())
        .js
        .pipe(ifElse(config.product, replace.bind(this, [
            ['\n', ' '],
            [/\s*=\s*/g, '='],
            [/\s*,\s*/g, ','],
            [/\s*\{\s*/g, '{'],
            [/\s*}\s*/g, '}'],
            [/\s+/g, ' ']
        ])))
        .pipe(gulp.dest(config.dist));
});

// 处理 HTML 文件
gulp.task('html', function () {
    return gulp.src(config.src + '/**/*.html')
        .pipe(ifElse(config.product, htmlMin.bind(this, {
            collapseWhitespace: true
        })))
        .pipe(gulp.dest(config.dist));
});

// 处理 Sass 文件
gulp.task('sass', function () {
    return gulp.src(config.src + '/**/*.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(autoPrefixer({
            browsers: ["Firefox >= 38",
                "Safari >= 7",
                "Chrome >= 26",
                "IE >= 10",
                "Opera >= 12"
            ]
        }))
        .pipe(ifElse(config.product, cleanCSS))
        .pipe(gulp.dest(config.dist));
});

// 复制不需要处理的文件
gulp.task('copy', function () {
    return gulp.src([
            config.src + '/**/*.txt',
            config.src + '/**/*.xml',
            config.src + '/**/*.pdf'
        ])
        .pipe(gulp.dest(config.dist));
});

// 处理字体文件
gulp.task('font', function () {
    return gulp.src([
            config.src + '/**/*.{eot,svg,ttf,woff,woff2}'
        ])
        .pipe(gulp.dest(config.dist));
});

// 处理 css 文件
gulp.task('css', function () {
    return gulp.src([
            config.src + '/**/*.css'
        ])
        .pipe(autoPrefixer({
            browsers: ["Firefox >= 38",
                "Safari >= 7",
                "Chrome >= 26",
                "IE >= 10",
                "Opera >= 12"
            ]
        }))
        .pipe(ifElse(config.product, cleanCSS))
        .pipe(gulp.dest(config.dist));
});

// 处理 js 文件
gulp.task('js', function () {
    return gulp.src([
            config.src + '/**/*.js'
        ])
        .pipe(ifElse(config.product, replace.bind(this, [
            ['\n', ' '],
            [/\s*=\s*/g, '='],
            [/\s*,\s*/g, ','],
            [/\s*\{\s*/g, '{'],
            [/\s*}\s*/g, '}'],
            [/\s+/g, ' ']
        ])))
        .pipe(gulp.dest(config.dist));
});

// 处理图片文件
gulp.task('image', function () {
    gulp.src(config.src + '/**/*.{png,jpeg,jpg,gif,ico,cur}')
        .pipe(ifElse(config.product, imageMin))
        .pipe(gulp.dest(config.dist));
});

// 处理 json 文件
gulp.task('json', function () {
    return gulp.src(config.src + '/**/*.json')
        .pipe(ifElse(config.product, replace.bind(this, [
            ['\n', ' '],
            [/\s*,\s*/g, ','],
            [/\s*\{\s*/g, '{'],
            [/\s*}\s*/g, '}'],
            [/\s+/g, ' ']
        ])))
        .pipe(gulp.dest(config.dist))
});

// 清除目录
gulp.task('clean', function () {
    return gulp.src(config.dist, {
            read: false
        })
        .pipe(clean());
});

// 创建一个本地 Server
gulp.task('serve', function () {
    browserSync.init({
        server: {
            baseDir: config.serverRoot
        }
    });
});

// 刷新浏览器中的页面
gulp.task('reload', function () {
    browserSync.reload();
});

// 开启一个本地服务器，并文件变化时刷新页面
gulp.task('serve:watch', ['serve'], function () {
    gulp.watch(config.src + '/**/*.ts', function () {
        runSequence(['typescript', 'reload']);
    });
    gulp.watch(config.src + '/**/*.json', function () {
        runSequence(['json', 'reload']);
    });
    gulp.watch(config.src + '/**/*.html', function () {
        runSequence(['html', 'reload']);
    });
    gulp.watch(config.src + '/**/*.scss', function () {
        runSequence(['sass', 'reload']);
    });
    gulp.watch(config.src + '/**/*.js', function () {
        runSequence(['js', 'reload']);
    });
    gulp.watch(config.src + '/**/*.css', function () {
        runSequence(['css', 'reload']);
    });
    gulp.watch(config.src + '/**/*.{png,jpeg,jpg,gif,ico}', function () {
        runSequence(['image', 'reload']);
    });
    gulp.watch([
        config.src + '/**/*.txt',
        config.src + '/**/*.xml'
    ], function () {
        runSequence(['copy', 'reload']);
    });
});

// 默认任务
gulp.task('default', ['clean'], function () {
    gulp.start(['typescript', 'json', 'sass', 'image', 'copy', 'font', 'css', 'js', 'html']);
});

// 产品发布任务
//  主要用于压缩所有的文件
gulp.task('product', ['clean'], function () {
    config.product = true;
    gulp.start(['typescript', 'json', 'sass', 'image', 'copy', 'font', 'css', 'js', 'html']);
});
