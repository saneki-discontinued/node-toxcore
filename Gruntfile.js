module.exports = function(grunt) {
  grunt.initConfig({
    jsdoc: {
      dist: {
        src: ['lib/tox.js'],
        options: {
          destination: 'doc'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-jsdoc');

  grunt.registerTask('default', ['jsdoc']);
};
