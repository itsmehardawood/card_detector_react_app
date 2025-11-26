// API endpoint to receive and log client-side messages
export async function POST(request) {
  try {
    const data = await request.json();
    
    const timestamp = new Date().toISOString();
    const logPrefix = data.level === 'error' ? '❌ CLIENT ERROR' : 
                      data.level === 'warn' ? '⚠️ CLIENT WARN' : 
                      '📱 CLIENT LOG';
    
    console.log(`\n${logPrefix} [${timestamp}]`);
    console.log('Message:', data.message);
    if (data.details) {
      console.log('Details:', JSON.stringify(data.details, null, 2));
    }
    if (data.error) {
      console.log('Error:', data.error);
    }
    console.log('---\n');
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('❌ Error in client-log API:', error);
    return Response.json({ success: false }, { status: 500 });
  }
}
