/** 
 * Make sure Graphicsmagick is installed on your system
 * osx: brew install graphicsmagick
 * ubuntu: apt-get install graphicsmagick
 * 
 * Install these gulp plugins
 * gulp, gulp-image-resize and gulp-imagemin
 * 
 * Create a task for each image size and call them all with master task
 * 
 **/

 // require these gulp plugins by install using: npm install --save-dev [gulp-plugin-name]
 /*eslint-env node */
const gulp = require('gulp');
const rename = require('gulp-rename');
const imageResize = require('gulp-image-resize');
const webp = require('gulp-webp');
const sass = require('gulp-sass');
const autoprefixer = require('gulp-autoprefixer');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const pump = require('pump'); // To find the exact file, with line number of error when run minification task
const browserSync = require('browser-sync').create();
/*const eslint = require('gulp-eslint');*/

const excludeImageFile = 'white_carbonfiber.png';
const excludeJsFile = 'dbhelper.js';


gulp.task('resize-sm', () => {
  return gulp.src(['./img/*.{jpg,png}','!./img/'+excludeImageFile])
  .pipe(imageResize({
      width: 375,     
      height: 280,
      crop: true,      
      upscale: false, // never increase image dimensions
      quality: 70, //Optional. The output quality to use for lossy JPEG, WebP and TIFF output formats. The default quality is 80. This property is ignored for PNG images
      progressive: true, //Optional. Use progressive (interlace) scan for JPEG and PNG output. This typically reduces compression performance by 30% but results in an image that can be rendered sooner when decompressed.
      withMetadata: false //Optional. Include all metadata (ICC, EXIF, XMP) from the input image in the output image. The default behaviour is to strip all metadata.
  }))
  .pipe(rename({ suffix: '_small', extname: '.jpg' }))
  .pipe(gulp.dest('./dist/img'))
  .pipe(webp())
  .pipe(rename({extname: '.webp' }))
  .pipe(gulp.dest('./dist/img'));
});        
    
gulp.task('resize-md', () => {
  return gulp.src(['./img/*.{jpg,png}','!./img/'+excludeImageFile])
  .pipe(imageResize({
    width: 480,     
    height: 360,
    crop: true,
    upscale: false,
    quality: 70,
    progressive: true,
    withMetadata: false
  }))  
  .pipe(rename({ suffix: '_medium', extname: '.jpg' }))
  .pipe(gulp.dest('./dist/img'))
  .pipe(webp())
  .pipe(rename({extname: '.webp' }))
  .pipe(gulp.dest('./dist/img'));
});

gulp.task('resize-lg', () => {
  return gulp.src(['./img/*.{jpg,png}','!./img/'+excludeImageFile])
  .pipe(imageResize({
      width: 800,     
      height: 600,
      crop: true,
      upscale: false,
      quality: 70,
      progressive: true,
      withMetadata: false
  }))  
  .pipe(rename({ suffix: '_large', extname: '.jpg' }))
  .pipe(gulp.dest('./dist/img'))
  .pipe(webp())
  .pipe(rename({extname: '.webp' }))
  .pipe(gulp.dest('./dist/img'));
});





// gulp.task('lint', () => {
//     // ESLint ignores files with "node_modules" paths.
//     // So, it's best to have gulp ignore the directory as well.
//     // Also, Be sure to return the stream from the task;
//     // Otherwise, the task may end before the stream has finished.
//     return gulp.src(['**/*.js', '!node_modules/**'])
//         // eslint() attaches the lint output to the "eslint" property
//         // of the file object so it can be used by other modules.
//         .pipe(eslint())
//         // eslint.format() outputs the lint results to the console.
//         // Alternatively use eslint.formatEach() (see Docs).
//         .pipe(eslint.format())
//         // To have the process exit with an error code (1) on
//         // lint error, return the stream and pipe to failAfterError last.
//         .pipe(eslint.failAfterError());
// });
 
gulp.task('copy-img', () => {
  return gulp.src(['img/favicon.png', 'img/' + excludeImageFile])
    .pipe(gulp.dest('dist/img'));
});

// Copy HTML file to dist folder for production files
gulp.task('copy-html', () => {
  return gulp.src('*.html')
    .pipe(gulp.dest('./dist'));
});

// Compile sass into CSS & auto-inject into browsers
gulp.task('sass', () => {
  return gulp.src('./scss/**/*.scss')
    .pipe(sass({
      outputStyle: 'compressed'
    }))
    .pipe(sass().on('error', sass.logError))
    .pipe(autoprefixer({
      browsers: ['last 2 versions'],
      cascade: false
    }))
    .pipe(gulp.dest('./dist/css'))
    //.pipe(browserSync.stream());
});

gulp.task('scripts', () => {
  return gulp.src(['js/app.js','sw.js','js/lib/idb.js','js/idbhelper.js','js/main.js','js/restaurant_info.js'])    
    .pipe(concat('bundle.js'))
    .pipe(gulp.dest('dist/js'));
})

gulp.task('scripts-dist', () => {
  return gulp.src(['js/app.js','sw.js','js/lib/idb.js','js/idbhelper.js','js/main.js','js/restaurant_info.js'])    
    .pipe(concat('bundle.min.js'))
    .pipe(uglify())    
    .pipe(gulp.dest('dist/js'));
})

gulp.task('uglify-error-debugging', function (cb) {
  pump([
    gulp.src('js/**/*.js'),
    uglify(),
    gulp.dest('dist/js')
  ], cb);
});

// Static Server + watching scss/html files
//gulp.task('serve', ['sass', 'lint'], () => {  
  gulp.task('serve', ['sass', 'copy-html'], () => {
    gulp.watch('./scss/*.scss', ['sass']);
    gulp.watch('./*.html', ['copy-html']);
    gulp.watch('./*.html').on('change', browserSync.reload);
    //gulp.watch('js/**/*.js', ['lint']);
    // browserSync.init({
    //      server: "./"
    //  });  
  });

gulp.task('default', ['serve']);

gulp.task('resize', ['resize-sm', 'resize-md', 'resize-lg']);
