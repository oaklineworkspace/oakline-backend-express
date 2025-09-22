
console.log('Environment Variables Debug:');
console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('All env keys:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));
