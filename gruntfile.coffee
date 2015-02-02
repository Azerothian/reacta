module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON 'package.json'
    copy:
      build:
        cwd: 'src'
        src: [ '**', '!**/*.coffee' ]
        dest: 'build'
        expand: true
    clean:
      build:
        [ 'build' ]
    coffee:
      lib:
        files:[
          expand: true
          cwd: 'src'
          src: ['**/*.coffee']
          dest: 'build'
          ext: '.js'
        ]
    watch:
      files: [
        'gruntfile.coffee'
        'src/**/*'
        'package.json'
      ]
      tasks: ['default']


  grunt.loadNpmTasks 'grunt-contrib-copy';
  grunt.loadNpmTasks 'grunt-contrib-clean';
  grunt.loadNpmTasks 'grunt-contrib-coffee';
  grunt.loadNpmTasks 'grunt-contrib-watch';
  grunt.loadNpmTasks 'grunt-install-dependencies';


  grunt.registerTask 'test', 'Runs build and test', [ 'default' ]
  grunt.registerTask 'default', 'Compiles all of the assets and copies the files to the build directory.', [ 'build' ]
  grunt.registerTask 'build', 'Builds the application', [ 'install-dependencies', 'clean', 'copy', 'coffee' ]
