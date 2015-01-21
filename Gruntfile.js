module.exports = function(grunt) {
  grunt.initConfig({
    jsdoc: {
      dist: {
        src: ['lib/tox.js', 'lib/toxdns.js', 'lib/toxencryptsave.js', 'lib/events.js'],
        options: {
          destination: 'doc'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-jsdoc');

  grunt.registerTask('default', ['jsdoc']);
};
