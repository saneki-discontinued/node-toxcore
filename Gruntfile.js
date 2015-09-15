module.exports = function(grunt) {
  grunt.initConfig({
    shell: {
      mocha: {
        command: 'mocha --recursive'
      }
    },
    jsdoc: {
      dist: {
        src: [
          'lib/events.js',
          'lib/tox.js',
          'lib/toxdns.js',
          'lib/toxencryptsave.js',
          'lib/toxoptions.js',
          'lib/tox_old.js'
        ],
        options: {
          destination: 'doc',
          private: false,
          template : 'node_modules/grunt-jsdoc/node_modules/ink-docstrap/template',
          configure : 'node_modules/grunt-jsdoc/node_modules/ink-docstrap/template/jsdoc.conf.json'
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-shell');

  grunt.registerTask('default', ['jsdoc']);
  grunt.registerTask('test', ['shell']);
};
