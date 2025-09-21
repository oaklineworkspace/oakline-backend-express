
import { spawn } from 'child_process';
import { AlertingSystem } from '../lib/monitoring/alerts.js';

async function runTests() {
  console.log('🧪 Running comprehensive banking tests...\n');
  
  try {
    // Run unit tests
    console.log('Running unit tests...');
    await runCommand('npm', ['test', 'tests/unit']);
    
    // Run integration tests
    console.log('Running integration tests...');
    await runCommand('npm', ['test', 'tests/integration']);
    
    // Run banking flow tests
    console.log('Running banking flow tests...');
    await runCommand('npm', ['test', 'tests/integration/banking-flows.test.js']);
    
    console.log('✅ All tests passed');
    
    // Run health checks
    console.log('Running system health checks...');
    await AlertingSystem.checkSystemHealth();
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { stdio: 'inherit' });
    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed with code ${code}`));
    });
  });
}

runTests();
