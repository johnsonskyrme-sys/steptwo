// debug.js - Extracted JavaScript from debug.html
const { createApp } = Vue;

createApp({
  data() {
    return {
      message: 'Vue.js is working!',
      concurrency: 5
    };
  },
  
  methods: {
    test() {
      console.log('test method');
    }
  },

  watch: {
    concurrency(newValue) {
      console.log('concurrency changed:', newValue);
    }
  }
}).mount('#debug-app');