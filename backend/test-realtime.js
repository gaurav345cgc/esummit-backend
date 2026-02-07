// Test Socket.io Realtime Connection
// Usage: node test-realtime.js <jwt_token>
// Example: node test-realtime.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

const io = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:3000';
const TOKEN = process.argv[2]; // Pass JWT token as argument

if (!TOKEN) {
  console.error('❌ Usage: node test-realtime.js <jwt_token>');
  console.error('   Example: node test-realtime.js eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
  console.error('\n   Get token from: POST /api/login or /api/register');
  process.exit(1);
}

console.log('🔌 Connecting to:', SOCKET_URL);
console.log('   Token:', TOKEN.substring(0, 20) + '...');

const socket = io(SOCKET_URL, {
  auth: { token: TOKEN },
  transports: ['websocket', 'polling'],
});

socket.on('connect', () => {
  console.log('✅ Connected to server');
});

socket.on('connected', (data) => {
  console.log('✅ Authenticated successfully!');
  console.log('   User ID:', data.user_id);
  console.log('👂 Listening for order_update events...');
  console.log('\n💡 Now trigger a webhook in another terminal:');
  console.log('   node test-webhook.js order_XXX');
});

socket.on('order_update', (data) => {
  console.log('\n🎉 Order update received!');
  console.log('   Order ID:', data.order_id);
  console.log('   Status:', data.status);
  console.log('   Pass ID:', data.pass_id);
  console.log('   Full data:', JSON.stringify(data, null, 2));
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

socket.on('error', (error) => {
  console.error('❌ Socket error:', error);
});

// Keep process alive
console.log('\n⏳ Waiting for events... (Press Ctrl+C to exit)\n');

process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...');
  socket.disconnect();
  process.exit(0);
});
