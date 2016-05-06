;(function(window){
  'use strict';

  // console.log function wrapper
  window.clog = function() {
    console.log(Array.prototype.slice.call(arguments));
  };
}(window));
