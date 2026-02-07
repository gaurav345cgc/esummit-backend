// Artillery helper functions for load testing
// Usage: artillery run artillery-test.yml

module.exports = {
  // Set JWT token for authenticated requests
  setToken: (context, events, done) => {
    // Get token from environment variable
    // PowerShell: $env:TEST_TOKEN = "your_token"
    // Bash: export TEST_TOKEN=your_token
    context.vars.token = process.env.TEST_TOKEN;
    
    if (!context.vars.token) {
      console.error('❌ ERROR: TEST_TOKEN not set!');
      console.error('   PowerShell: $env:TEST_TOKEN = "your_jwt_token"');
      console.error('   Bash: export TEST_TOKEN=your_jwt_token');
      console.error('   Or edit artillery-test.yml and hardcode token in headers');
      process.exit(1);
    }
    
    return done();
  }
};
