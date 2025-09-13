// debug-dashboard.js - Extracted JavaScript from debug-dashboard.html
const { createApp } = Vue;

createApp({
  data() {
    return {
      message: 'STEPTWO Dashboard Working!',
      concurrency: 5
    };
  },
  
  methods: {
    test() {
      console.log('test method working');
      this.message = 'Button clicked!';
    },
    
    checkWelcomeGuideVisibility() {
      const dismissed = localStorage.getItem('steptwo_welcome_dismissed');
      console.log('checkWelcomeGuideVisibility called', dismissed);
    }
  },

  watch: {
    concurrency(newValue) {
      console.log('concurrency changed:', newValue);
    }
  }
}).mount('#app');